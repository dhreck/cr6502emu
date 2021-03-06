import Vue from "vue"
import App from "./App.vue"
import router from "./router"
import store from "./store"
import {default as i18n} from "./i18n"

import "../node_modules/uikit/dist/js/uikit.min"

import {library} from "@fortawesome/fontawesome-svg-core"
import {FontAwesomeIcon} from "@fortawesome/vue-fontawesome"

// commented == imported more than once
import {
    //TheNavbar
    faLanguage, faCaretDown,

    //Home
    faArrowCircleRight, faPlusSquare, faUpload,

    //About
    faCode,

    //Alert
    faInfoCircle, faExclamationTriangle, faTimesCircle,

    //ErrorNotFound
    faExternalLinkSquareAlt,

    //Modal
    faTimes,

    //EnvironmentWidget
    faBars,

    //EnvironmentWidgetsHolder
    faPlus,

    //Environment
    /*faCog, faTimesCircle*/

    //EnvironmentActionBar
    faHammer, faSyncAlt, faPlay, faStop, faBug, faChevronRight, faCog,

    //EnvironmentLogBar
    /*faChevronRight,*/ faGhost, faChevronDown,

    //EnvironmentSettingPrjFile
    faTrashAlt, faDownload,

    //EnvironmentSettingPrjDevices
    /*faTrashAlt, faPlus,*/ faRandom,

    //EnvironmentWidgetAsciiIOBuffer
    faSortAmountDownAlt,

}
    from "@fortawesome/free-solid-svg-icons"

library.add(
    faLanguage, faCaretDown,
    faArrowCircleRight, faPlusSquare, faUpload,
    faCode,
    faExternalLinkSquareAlt,
    faInfoCircle, faExclamationTriangle, faTimesCircle,
    faTimes,
    faBars,
    faPlus,
    faCog, faTimesCircle,
    faHammer, faSyncAlt, faPlay, faStop, faBug, faChevronRight, faCog,
    faChevronRight, faGhost, faChevronDown,
    faTrashAlt, faDownload,
    faRandom,
    faSortAmountDownAlt,
);

Vue.component("font-awesome-icon", FontAwesomeIcon);


Vue.config.productionTip = false;

store.commit("global/setI18n", i18n); // needed before rendering

new Vue({
    router,
    store,
    i18n,
    render: h => h(App)
}).$mount("#app");

window.addEventListener("beforeunload", async _ => {
    if (!store.getters["prj/isSafeToShutdown"]) {
        await store.dispatch("prj/beforeShutdown")
    }
});

window.addEventListener("storage", _ => {
    store.commit("prj/syncFromLS");
});

store.commit("prj/reloadFromLS");

store.dispatch("global/tryLoadLocaleFromLS");
