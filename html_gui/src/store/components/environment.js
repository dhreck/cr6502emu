import {DeviceIdTools} from "../../assets/js/deviceIdTools";

const asmLib = require(process.env.VUE_APP_ASM_JS_PATH);
const sysLib = require(process.env.VUE_APP_SYS_JS_PATH);


export const EnvironmentState = {
    SETTING_UP: 0,
    INITIALIZING: 1,
    FAILED_TO_INIT: 2,

    IDLE: 10,

    RUNNING: 20,
    DEBUGGING: 21,
}

export const EnvironmentStore = {
    namespaced: true,

    state: {
        lock: {
            build: false,
            reset: false,
            execute: false,
            config: false,
        },

        status: {
            buildSuccessful: false,
            currentAction: EnvironmentState.SETTING_UP,
        },

        wasm: {
            assembler: null,
            system: null,
        },

        devices: [],

        messages: [],
    },

    mutations: {
        __setAsm(state, obj) {
            state.wasm.assembler = obj;
        },

        __setSys(state, obj) {
            state.wasm.system = obj;
        },


        __setDevices(state, obj) {
            state.devices = obj;
        },


        buildStatus(state, value) {
            state.status.buildSuccessful = value;
        },

        currentStatus(state, value = EnvironmentState.IDLE) {
            state.status.currentAction = value;
        },


        addMessage(state, value) {
            state.messages.push(value);
        },

        resetMessages(state) {
            state.messages = [];
        },
    },

    actions: {
        setup(context, callback) {
            asmLib.default(process.env.VUE_APP_ASM_WASM_PATH).then(
                wasm => {
                    let assembler = new asmLib.Assembler();
                    assembler.memory = wasm.memory;

                    asmLib.set_panic_hook();

                    context.commit("__setAsm", assembler);
                }
            )
                .then(
                    _ => {
                        return sysLib.default(process.env.VUE_APP_SYS_WASM_PATH).then(
                            wasm => {
                                let system = new sysLib.System();
                                system.memory = wasm.memory;

                                sysLib.set_panic_hook();

                                context.commit("__setSys", system);
                            }
                        )
                    })

                .then(
                    _ => context.commit("currentStatus", EnvironmentState.INITIALIZING)
                )

                .then(
                    _ => {
                        if (typeof callback === "function") {
                            callback();
                        }
                    }
                )

                .catch(
                    err => {
                        console.error("Failed to setup env: ", err);

                        context.commit("currentStatus", EnvironmentState.FAILED_TO_INIT);
                    }
                )
        },

        initialize(context) {
            const DeviceId = sysLib.DeviceId;

            context.dispatch("purgeAndReloadDeviceCache");

            context.dispatch("addDeviceWithWidget", {type: DeviceId.Ram, start: 0, end: 0x1000});
            context.dispatch("addDeviceWithWidget", {type: DeviceId.Rom, start: 0x1000, end: 0x1000});

            context.commit("currentStatus", EnvironmentState.IDLE);
        },


        buildToRom(context) {
            context.commit("resetMessages");

            const asm = context.getters.__assembler;
            const sys = context.getters.__system;

            let romIndex = 2; //TMP
            let ptr = sys.device_data_ptr_by_index(romIndex);
            let size = context.state.devices[romIndex].size;

            let program = document.querySelector("#editor").innerText;
            let romData = new Uint8Array(sys.memory.buffer, ptr, size);

            let success = asm.assemble(program, romData);

            context.dispatch("updateAllDevicesWidgets");
            context.commit("buildStatus", success);
        },

        resetSystem(context) {
            context.getters.__system.reset_system();

            context.dispatch("updateAllDevicesWidgets");
        },

        toggleRun(context) {
            if (context.getters.isRunning) {
                context.commit("currentStatus", EnvironmentState.IDLE);
            } else {
                context.dispatch("resetSystem");

                context.commit("currentStatus", EnvironmentState.RUNNING);
            }
        },

        toggleDebug(context) {
            if (context.getters.isDebugging) {
                context.commit("currentStatus", EnvironmentState.IDLE);
            } else {
                context.dispatch("resetSystem");

                context.commit("currentStatus", EnvironmentState.DEBUGGING);
            }
        },

        systemTick(context) {
            context.getters.__system.tick();

            context.dispatch("updateAllDevicesWidgets");
        },

        systemExecuteOperation(context) {
            context.getters.__system.execute_operation();

            context.dispatch("updateAllDevicesWidgets");
        },
        

        purgeAndReloadDeviceCache(context, updateWidgets = true) {
            let sys = context.getters.__system;
            let newCache = [];

            let index = 0;
            let dev = sys.device_representation_by_index(0);

            while (dev !== undefined) {
                newCache.push(dev);
                if (updateWidgets) {
                    // we need to update the devices widgets before they are committed (and thus rendered)
                    // as the widget data is an empty object on creation and trying to access it could lead to exceptions.
                    context.dispatch("updateDeviceWidgetByIndex", [index, dev]);
                }

                index++;

                dev = sys.device_representation_by_index(index);
            }

            context.commit("__setDevices", newCache);
        },


        addDeviceWithWidget(context, {type, start, end, uid}) {
            let actualUid = uid || DeviceIdTools.getRandomUID();

            let success = context.getters.__system.add_device_with_uid(type, start, end, actualUid);

            if (success) {
                let newDevIndex = context.state.devices.length; // assuming we are synchronized with rust

                let newDev = context.getters.__system.device_representation_by_index(newDevIndex);

                context.dispatch("updateDeviceWidgetByIndex", [newDevIndex, newDev]);

                context.state.devices.push(newDev);
            }

            return success;
        },

        updateDeviceWidgetByIndex(context, data) {
            let dev;
            let index;

            if (typeof data === "object") {
                index = data[0];
                dev = data[1];
            } else {
                index = data;
                dev = context.state.devices[index];
            }

            let handler = DeviceIdTools.getUpdater(dev.type);

            let updatePackage = context.getters.__system.device_widget_update_by_index(index);

            let getMemFn = function () {
                let ptr = context.getters.__system.device_data_ptr_by_index(index);

                return new Uint8Array(context.getters.__system.memory.buffer, ptr, dev.size);
            }

            handler(dev.widget, updatePackage, getMemFn)
        },

        updateAllDevicesWidgets(context) {
            for (let i = 0; i < context.state.devices.length; i++) {
                context.dispatch("updateDeviceWidgetByIndex", i);
            }
        }

    },

    getters: {
        __assembler(state) {
            return state.wasm.assembler;
        },

        __system(state) {
            return state.wasm.system;
        },


        messagesList(state) {
            return state.messages;
        },


        isInitializing(state) {
            return (
                state.status.currentAction === EnvironmentState.SETTING_UP ||
                state.status.currentAction === EnvironmentState.INITIALIZING
            );
        },

        successfulInitialize(state) {
            return state.status.currentAction !== EnvironmentState.FAILED_TO_INIT;
        },


        isRunning(state) {
            return state.status.currentAction === EnvironmentState.RUNNING;
        },

        isDebugging(state) {
            return state.status.currentAction === EnvironmentState.DEBUGGING;
        },

        isExecuting(state, getters) {
            return getters.isRunning || getters.isDebugging;
        },

        isBuilt(state) {
            return state.status.buildSuccessful;
        },


        ableToBuild(state, getters) {
            return !(state.lock.build || getters.isExecuting);
        },

        ableToReset(state, getters) {
            return !(state.lock.reset || getters.isExecuting) && getters.isBuilt;
        },

        ableToRun(state, getters) {
            return !(state.lock.execute || getters.isDebugging) && getters.isBuilt;
        },

        ableToDebug(state, getters) {
            return !(state.lock.execute || getters.isRunning) && getters.isBuilt;
        },

        ableToStep(state, getters) {
            return getters.isDebugging;
        },

        ableToConfig(state, getters) {
            return !(state.lock.config || getters.isExecuting);
        },


        deviceList(state) {
            return state.devices;
        }

    }
}
