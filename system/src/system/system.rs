use wasm_bindgen::prelude::wasm_bindgen;
use js_sys::Map;

use super::MemManager;

use crate::cpu::CPU;
use crate::dev::{DeviceId, DeviceFactory, DeviceRepresentation};

#[wasm_bindgen]
pub struct System {
    cpu: CPU,

    mem: MemManager,
}

#[wasm_bindgen]
impl System {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        System {
            cpu: CPU::new(),

            mem: MemManager::new(),
        }
    }

    pub fn tick(&mut self) {
        self.mem.tick(); //tick the bus and all the devices

        self.cpu.tick(&mut self.mem);
    }

    pub fn tick_x(&mut self, amm: i32) {
        for _ in 0..amm {
            self.tick();
        }
    }

    /// Resets the system, clearing all non-persistent data containers.
    pub fn reset_system(&mut self) {
        self.cpu.reset();

        self.mem.reset_bus();
        self.mem.reset_devices();
    }

    /// Resets the system, clearing all data containers, including persistent ones like the rom.
    pub fn reset_hard(&mut self) {
        self.cpu.reset();

        self.mem.reset_bus();
        self.mem.reset_devices_hard();
    }

    pub fn add_device_with_uid(&mut self, device: DeviceId, start: u16, size: u16, uid: u16) -> bool {
        if (std::u16::MAX - size) >= start { //check for overflows
            let result = DeviceFactory::with_size(device, size);

            match result {
                Ok(dev) => {
                    let end = start + dev.size();

                    self.mem.add_device_unchecked_range(dev, start, end, uid);

                    true
                }

                Err(_) => {
                    // for now the only possible error (in the factory) is an invalid size,
                    // in the future we might want to be more explicit.
                    false
                }
            }
        } else {
            // the range should have already been validated by the client,
            // this wont be reached if properly implemented.
            false
        }
    }

    pub fn remove_device_by_index(&mut self, index: usize) -> bool {
        self.mem.remove_device_by(index)
    }

    // we cant (yet?) send a Vec/n size array (at least not without using serde and its huge dependencies),
    // maybe we could change this in the future.
    /// Returns a representation of device [Index], if it exists, or a None/null.
    pub fn device_representation_by_index(&self, index: usize) -> Option<DeviceRepresentation> {
        self.mem.devices()
            .get(index)
            .map(|dev| DeviceRepresentation::from_dev_holder(dev))
    }

    /// WARNING: Using raw pointers might cause system instability,
    /// make sure you know what you're doing.
    pub fn device_data_ptr_by_index(&mut self, index: usize) -> Option<usize> {
        self.mem.device_data_ptr(index)
    }

    pub fn device_widget_update_by_index(&self, index: usize) -> Option<Map> {
        self.mem.devices()
            .get(index)
            .and_then(|dev| dev.device().update_widget())
    }
}
