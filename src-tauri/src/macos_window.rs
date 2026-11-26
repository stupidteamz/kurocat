use std::ptr::NonNull;

use block2::RcBlock;
use objc2::MainThreadMarker;
use objc2_app_kit::{
    NSApplicationDidChangeScreenParametersNotification, NSNormalWindowLevel, NSScreen,
    NSStatusWindowLevel, NSWindow, NSWindowCollectionBehavior as Behavior,
};
use objc2_core_foundation::{CFRetained, CFUUID};
use objc2_foundation::{
    NSNotification, NSNotificationCenter, NSNumber, NSOperationQueue, NSPoint, NSRect, NSSize,
    NSString,
};
use tauri::menu::{CheckMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

use crate::config::save_settings;
use crate::AppState;

const DISPLAY_ITEM_PREFIX: &str = "mac_display:";
const FREE_PLACEMENT_ITEM: &str = "mac_display_free";

#[link(name = "ColorSync", kind = "framework")]
extern "C" {
    fn CGDisplayCreateUUIDFromDisplayID(display: u32) -> Option<NonNull<CFUUID>>;
}

struct Display {
    id: String,
    name: String,
    visible_frame: NSRect,
}

struct DisplayMenu(Submenu<tauri::Wry>);

fn displays(mtm: MainThreadMarker) -> Vec<Display> {
    // AppKit returns the primary display first.
    NSScreen::screens(mtm)
        .iter()
        .filter_map(|screen| {
            let number = screen
                .deviceDescription()
                .objectForKey(&NSString::from_str("NSScreenNumber"))?
                .downcast::<NSNumber>()
                .ok()?
                .unsignedIntValue();
            let id = unsafe { CGDisplayCreateUUIDFromDisplayID(number) }
                .map(|uuid| unsafe { CFRetained::from_raw(uuid) })
                .and_then(|uuid| CFUUID::new_string(None, Some(&uuid)))
                .map(|uuid| uuid.to_string())
                .unwrap_or_else(|| number.to_string());
            Some(Display {
                id,
                name: screen.localizedName().to_string(),
                visible_frame: screen.visibleFrame(),
            })
        })
        .collect()
}

fn target_display<'a>(displays: &'a [Display], preferred: Option<&str>) -> Option<&'a Display> {
    preferred
        .and_then(|id| displays.iter().find(|display| display.id == id))
        .or_else(|| displays.first())
}

fn with_native_window<T>(
    window: &WebviewWindow,
    action: impl FnOnce(MainThreadMarker, &NSWindow) -> T,
) -> Option<T> {
    let mtm = MainThreadMarker::new()?;
    let native = window.ns_window().ok()?.cast::<NSWindow>();
    // Tauri owns the NSWindow, and the reference stays on the main thread for this call.
    let native = unsafe { native.as_ref()? };
    Some(action(mtm, native))
}

fn bottom_right_frame(visible: NSRect, size: NSSize) -> NSRect {
    const RIGHT_MARGIN: f64 = 28.0;
    const BOTTOM_MARGIN: f64 = 16.0;
    NSRect::new(
        NSPoint::new(
            (visible.origin.x + visible.size.width - size.width - RIGHT_MARGIN)
                .max(visible.origin.x),
            visible.origin.y + BOTTOM_MARGIN,
        ),
        size,
    )
}

pub fn place(window: &WebviewWindow, preferred: Option<&str>) -> bool {
    with_native_window(window, |mtm, native| {
        let connected = displays(mtm);
        let Some(display) = target_display(&connected, preferred) else {
            return false;
        };
        native
            .setFrameOrigin(bottom_right_frame(display.visible_frame, native.frame().size).origin);
        true
    })
    .unwrap_or(false)
}

pub fn resize_pinned(window: &WebviewWindow, width: f64, height: f64) {
    let window = window.clone();
    let _ = window.clone().run_on_main_thread(move || {
        let preferred = window
            .state::<AppState>()
            .settings
            .lock()
            .unwrap()
            .display_id
            .clone();
        let _ = with_native_window(&window, |mtm, native| {
            let size = NSSize::new(width, height);
            let mut frame = native.frame();
            let connected = displays(mtm);
            if let Some(display) = preferred
                .as_deref()
                .and_then(|id| target_display(&connected, Some(id)))
            {
                frame = bottom_right_frame(display.visible_frame, size);
            } else {
                frame.origin.x += frame.size.width - size.width;
                frame.size = size;
            }
            native.setFrame_display(frame, true);
        });
    });
}

pub fn is_at_display_corner(window: &WebviewWindow, preferred: &str) -> bool {
    with_native_window(window, |mtm, native| {
        let connected = displays(mtm);
        let Some(display) = target_display(&connected, Some(preferred)) else {
            return true;
        };
        let frame = native.frame();
        let expected = bottom_right_frame(display.visible_frame, frame.size).origin;
        (frame.origin.x - expected.x).abs() <= 1.0 && (frame.origin.y - expected.y).abs() <= 1.0
    })
    .unwrap_or(true)
}

pub fn configure_fullscreen(window: &WebviewWindow, always_on_top: bool) {
    let window = window.clone();
    let _ = window.clone().run_on_main_thread(move || {
        let _ = with_native_window(&window, |_, native| {
            let mut behavior = native.collectionBehavior();
            behavior.remove(Behavior::MoveToActiveSpace | Behavior::Managed | Behavior::Transient);
            behavior.insert(Behavior::CanJoinAllSpaces | Behavior::Stationary);
            behavior.remove(
                Behavior::FullScreenPrimary
                    | Behavior::FullScreenAuxiliary
                    | Behavior::FullScreenNone,
            );

            if objc2::available!(macos = 13.0) {
                behavior.remove(Behavior::Primary | Behavior::Auxiliary);
                behavior.insert(Behavior::CanJoinAllApplications);
            } else {
                behavior.insert(Behavior::FullScreenAuxiliary);
            }

            native.setCollectionBehavior(behavior);
            native.setLevel(if always_on_top {
                NSStatusWindowLevel
            } else {
                NSNormalWindowLevel
            });
        });
    });
}

pub fn create_display_menu(app: &AppHandle) -> tauri::Result<Submenu<tauri::Wry>> {
    let menu = Submenu::with_id(app, "mac_display_menu", "选择显示器", true)?;
    app.manage(DisplayMenu(menu.clone()));
    refresh_menu(app)?;

    let handle = app.clone();
    let observer = RcBlock::new(move |_: NonNull<NSNotification>| {
        restore_pinned_position(&handle);
        let _ = refresh_menu(&handle);
    });
    // The notification center retains the observer for the lifetime of the app.
    unsafe {
        NSNotificationCenter::defaultCenter().addObserverForName_object_queue_usingBlock(
            Some(NSApplicationDidChangeScreenParametersNotification),
            None,
            Some(&NSOperationQueue::mainQueue()),
            &observer,
        );
    }
    Ok(menu)
}

pub fn refresh_menu(app: &AppHandle) -> tauri::Result<()> {
    let Some(menu) = app.try_state::<DisplayMenu>() else {
        return Ok(());
    };
    let Some(mtm) = MainThreadMarker::new() else {
        return Ok(());
    };
    let preferred = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .display_id
        .clone();
    let connected = displays(mtm);
    let selected = preferred
        .as_deref()
        .and_then(|id| target_display(&connected, Some(id)));

    for index in (0..menu.0.items()?.len()).rev() {
        menu.0.remove_at(index)?;
    }
    for (index, display) in connected.iter().enumerate() {
        let label = if index == 0 {
            format!("{}（主显示器）", display.name)
        } else {
            format!("{}（显示器 {}）", display.name, index + 1)
        };
        let item = CheckMenuItem::with_id(
            app,
            format!("{DISPLAY_ITEM_PREFIX}{}", display.id),
            label,
            true,
            selected.is_some_and(|selected| selected.id == display.id),
            None::<&str>,
        )?;
        menu.0.append(&item)?;
    }
    let free = CheckMenuItem::with_id(
        app,
        FREE_PLACEMENT_ITEM,
        "自由摆放",
        true,
        preferred.is_none(),
        None::<&str>,
    )?;
    menu.0.append(&free)
}

pub fn restore_pinned_position(app: &AppHandle) {
    let preferred = app
        .state::<AppState>()
        .settings
        .lock()
        .unwrap()
        .display_id
        .clone();
    if let Some(id) = preferred.as_deref() {
        if let Some(window) = app.get_webview_window("main") {
            place(&window, Some(id));
        }
    }
}

pub fn handle_display_menu(app: &AppHandle, item_id: &str) {
    let preferred = match item_id.strip_prefix(DISPLAY_ITEM_PREFIX) {
        Some(id) => Some(id.to_owned()),
        None if item_id == FREE_PLACEMENT_ITEM => None,
        None => return,
    };
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if let Some(id) = preferred.as_deref() {
        if !place(&window, Some(id)) {
            return;
        }
    }
    let position = window.outer_position().ok();
    let state = app.state::<AppState>();
    let updated = {
        let mut settings = state.settings.lock().unwrap();
        settings.display_id = preferred;
        if let Some(position) = position {
            settings.x = Some(position.x);
            settings.y = Some(position.y);
        }
        save_settings(&settings);
        settings.clone()
    };
    let _ = refresh_menu(app);
    let _ = app.emit("kuro-settings", updated);
}

#[derive(Debug, Clone, Copy)]
pub struct DragSnapshot {
    pub origin_x: f64,
    pub origin_y: f64,
    pub width: f64,
    pub height: f64,
    pub min_x: f64,
    pub max_x: f64,
    pub min_y: f64,
    pub max_y: f64,
}

#[allow(dead_code)]
pub fn clamp_drag_origin(
    x: f64,
    y: f64,
    win_w: f64,
    win_h: f64,
    bounds: NSRect,
) -> (f64, f64) {
    let (min_x, max_x, min_y, max_y) = crate::macos_drag_bounds(
        win_w,
        win_h,
        bounds.origin.x,
        bounds.origin.y,
        bounds.origin.x + bounds.size.width,
        bounds.origin.y + bounds.size.height,
    );
    (x.clamp(min_x, max_x), y.clamp(min_y, max_y))
}

fn query_drag_snapshot_on_main(app: &AppHandle) -> Option<DragSnapshot> {
    let window = app.get_webview_window("main")?;
    with_native_window(&window, |mtm, native| {
        let frame = native.frame();
        let screen_frames: Vec<(f64, f64, f64, f64)> = NSScreen::screens(mtm)
            .iter()
            .map(|screen| {
                let rect = screen.frame();
                (
                    rect.origin.x,
                    rect.origin.y,
                    rect.size.width,
                    rect.size.height,
                )
            })
            .collect();
        let (u_min_x, u_min_y, u_max_x, u_max_y) = crate::macos_screens_union(&screen_frames)?;
        let (min_x, max_x, min_y, max_y) = crate::macos_drag_bounds(
            frame.size.width,
            frame.size.height,
            u_min_x,
            u_min_y,
            u_max_x,
            u_max_y,
        );
        Some(DragSnapshot {
            origin_x: frame.origin.x,
            origin_y: frame.origin.y,
            width: frame.size.width,
            height: frame.size.height,
            min_x,
            max_x,
            min_y,
            max_y,
        })
    })
    .flatten()
}

pub fn drag_snapshot(app: &AppHandle) -> Option<DragSnapshot> {
    if MainThreadMarker::new().is_some() {
        return query_drag_snapshot_on_main(app);
    }
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    let handle = app.clone();
    if app
        .run_on_main_thread(move || {
            let _ = tx.send(query_drag_snapshot_on_main(&handle));
        })
        .is_err()
    {
        return None;
    }
    rx.recv_timeout(std::time::Duration::from_millis(250))
        .ok()
        .flatten()
}

pub fn set_window_origin(app: &AppHandle, x: f64, y: f64) {
    if !x.is_finite() || !y.is_finite() {
        return;
    }
    let handle = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(window) = handle.get_webview_window("main") {
            let _ = with_native_window(&window, |_, native| {
                native.setFrameOrigin(NSPoint::new(x, y));
            });
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn corners_use_global_appkit_coordinates() {
        let visible = NSRect::new(NSPoint::new(-2304.0, 120.0), NSSize::new(2304.0, 1250.0));
        let frame = bottom_right_frame(visible, NSSize::new(260.0, 410.0));
        assert_eq!(frame.origin, NSPoint::new(-288.0, 136.0));
    }

    #[test]
    fn drag_origin_clamp_respects_appkit_y_up_headroom_and_margins() {
        let union = NSRect::new(NSPoint::new(-2304.0, 0.0), NSSize::new(3816.0, 1416.0));
        let (x, y_top) = clamp_drag_origin(200.0, 2000.0, 420.0, 440.0, union);
        assert_eq!(x, 200.0);
        // 1416 - 440 + round(440 * 0.17) = 1051
        assert_eq!(y_top, 1051.0);

        let (x_left, y_bottom) = clamp_drag_origin(-5000.0, -900.0, 420.0, 440.0, union);
        assert_eq!(x_left, -2346.0);
        // 0 + round(440 * 0.68) - 440 = -141
        assert_eq!(y_bottom, -141.0);
    }

    #[test]
    fn disconnected_preference_falls_back_to_primary() {
        let screen = |id: &str| Display {
            id: id.to_owned(),
            name: id.to_owned(),
            visible_frame: NSRect::default(),
        };
        let connected = [screen("main"), screen("external")];
        assert_eq!(
            target_display(&connected, Some("external")).unwrap().id,
            "external"
        );
        assert_eq!(
            target_display(&connected, Some("absent")).unwrap().id,
            "main"
        );
    }
}
