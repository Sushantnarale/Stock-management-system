sap.ui.define([
    "sap/ui/core/UIComponent",
    "managerapproval/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("managerapproval.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // Load custom CSS
            jQuery.sap.includeStyleSheet("managerapproval/css/style.css");

            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});
