<template>
    <Modal
        :allow-stack="true"

        dom-id="swapDevicesPrompt"

        ref="modal"
    >

        <template v-slot:toggle>
            <button class="cr-info uk-button">
                <font-awesome-icon icon="random"/>
                <span
                    class="cr-mg-t"
                    v-t="'environment.settings.EnvironmentSettingPrjDevices.swapPrompt.button.toggle'"
                />
            </button>
        </template>


        <template v-slot:header>
            <h3
                class="uk-modal-title uk-light"
                v-t="'environment.settings.EnvironmentSettingPrjDevices.swapPrompt.title'"
            />
        </template>

        <template v-slot:body>
            <div class="uk-form-stacked uk-light">
                <Alert
                    v-if="failedToSwap"

                    type="err"
                >
                    <span v-t="'environment.settings.EnvironmentSettingPrjDevices.swapPrompt.failedToSwap'"/>
                </Alert>


                <div class="uk-margin">
                    <label
                        class="uk-form-label"
                        v-t="'environment.settings.EnvironmentSettingPrjDevices.swapPrompt.dev.a'"
                    />
                    <select
                        v-model="deviceA"

                        class="uk-select"
                    >
                        <option value="null" class="uk-hidden">
                            {{ $t("environment.settings.EnvironmentSettingPrjDevices.swapPrompt.dev.select") }}
                        </option>

                        <option
                            v-for="(devNames, index) in devicesReprString"
                            :key="index"

                            :value="index"
                        >
                            {{ devNames }}
                        </option>
                    </select>
                </div>

                <div class="uk-margin">
                    <label
                        class="uk-form-label"
                        v-t="'environment.settings.EnvironmentSettingPrjDevices.swapPrompt.dev.b'"
                    />
                    <select
                        v-model="deviceB"

                        class="uk-select"
                    >
                        <option value="null" class="uk-hidden">
                            {{ $t("environment.settings.EnvironmentSettingPrjDevices.swapPrompt.dev.select") }}
                        </option>

                        <option
                            v-for="(devNames, index) in devicesReprString"
                            :key="index"

                            :value="index"
                        >
                            {{ devNames }}
                        </option>
                    </select>
                </div>


            </div>
        </template>

        <template v-slot:footer>
            <button
                @click="swapDevices"

                :disabled="!allowSubmit"

                class="uk-button uk-button-primary"
                v-t="'environment.settings.EnvironmentSettingPrjDevices.swapPrompt.button.submit'"
            />
        </template>
    </Modal>
</template>

<script>
    import Modal from "./Modal";
    import {mapActions, mapGetters} from "vuex";
    import MixinPreferredNumericBase from "./MixinPreferredNumericBase";
    import Alert from "./Alert";

    export default {
        name: "EnvironmentPromptSwapDevices",
        mixins: [MixinPreferredNumericBase],
        components: {Alert, Modal},

        data() {
            return {
                deviceA: null,
                deviceB: null,

                failedToSwap: false,
            }
        },

        computed: {
            ...mapGetters("env", [
                "deviceListWithoutCpu"
            ]),

            devicesReprString() {
                return this.deviceListWithoutCpu.map(dev => dev.getRepresentationString(this.preferredNumericBase));
            },

            allowSubmit() {
                return (this.deviceA != null && this.deviceB != null) &&
                    this.deviceA !== this.deviceB;
            },
        },

        methods: {
            ...mapActions("env", [
                "swapDevicesByIndex"
            ]),

            swapDevices() {
                this.swapDevicesByIndex([this.deviceA + 1, this.deviceB + 1]).then(success => {
                    this.failedToSwap = !success;

                    if (success) {
                        this.$refs.modal.hideModal();
                    }
                });
            }
        },
    }
</script>
