sap.ui.define([
    "sap/ui/core/UIComponent",
    "storemanager/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("storemanager.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
            var oStoreModel = new sap.ui.model.json.JSONModel({
                requestList: [],
                materials: [],
                isRequestSelected: false
            });
            this.setModel(oStoreModel, "storeModel");
        }
    });
});