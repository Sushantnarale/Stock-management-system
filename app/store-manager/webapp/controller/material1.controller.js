sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("storemanager.controller.material1", {
        onInit: function () {
            const oModel = new JSONModel({
                materials: [],
                countOk:0,
                countNotOk:0,
                selectedRequest: null,
                editable: true // default
                

            });
            this.getView().setModel(oModel, "storeModel");

            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("Material1").attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            const requestId = oEvent.getParameter("arguments").requestId;
            const oModel = this.getView().getModel("storeModel");
            const that = this;

        
            // Fetch request first to determine status
            $.ajax({
                url: `/odata/v4/stock/T_Request('${requestId}')`,
                method: "GET",
                success: function (oRequestResponse) {
                    oModel.setProperty("/selectedRequest", oRequestResponse);
        
                    const requestStatus = oRequestResponse.RequestStatus;
                    const isEditable = !(requestStatus === "CLOSED" || requestStatus === "P_CLOSED");
        
                    // Fetch materials only after getting the request
                    $.ajax({
                        url: `/odata/v4/stock/T_material?$filter=Request_ID eq '${requestId}' and IsOptionalAllow eq true`,
                        method: "GET",
                        success: function (oMaterialResponse) {
                            oMaterialResponse.value.forEach(function (item) {
                                item.MaterialDecision = "";
                                item.selected = true;
                                item.editable = isEditable; //  Mark each material row as editable or not
                            });
                            oModel.setProperty("/materials", oMaterialResponse.value);
                            oModel.setProperty("/editable", isEditable);

                        },
                        error: function () {
                            MessageToast.show("Failed to fetch materials.");
                        }
                    });
                },
                error: function () {
                    MessageToast.show("Failed to fetch request.");
                }
            });
        },
        

        onApproveSingleMaterial: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent(); // Get the parent ColumnListItem
            var oContext = oItem.getBindingContext("storeModel");
            var allocatedQuantity = oItem.getCells()[4].getValue(); // Get the value from the Input field (Allocated Quantity)
        
            // Validate the allocated quantity
            if (!allocatedQuantity || isNaN(allocatedQuantity) || Number(allocatedQuantity) <= 0) {
                MessageToast.show("Please enter a valid positive quantity before approving.");
                return; // Exit the function to prevent further processing
            }
        
            // Proceed to allocate material if the quantity is valid
            this.onAllocate(oEvent);
        },
        
        onNotInStockSingleMaterial: function (oEvent) {
            this.onNotInStock(oEvent);
        },


        onNotInStock: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent();
            var oContext = oItem.getBindingContext("storeModel");
            var oModel = this.getView().getModel("storeModel");
            var allocatedQuantity = oItem.getCells()[4].getValue(); // Get the value from the Input field (Allocated Quantity)

            var sMaterialID = oContext.getProperty("ID");
            var sRequestID = oContext.getProperty("Request_ID");

            if (!sMaterialID || !sRequestID) {
                MessageToast.show("Missing data.");
                return;
            }

            var sMaterialUrl = "/odata/v4/stock/T_material('" + sMaterialID + "')";
            var that = this;

            $.ajax({
                url: sMaterialUrl,
                type: "PATCH",
                contentType: "application/json",
                data: JSON.stringify({
                    IsMaterialAllocate: false,

                }),
                success: function () {
                    MessageToast.show("Marked as Not in Stock.");
                    oContext.getModel().setProperty(oContext.getPath() + "/IsMaterialAllocate", false);
                    // that._evaluateRequestStatus(sRequestID);
                    // oEvent.getSource().setEnabled(false);
                    let countNotOk = oModel.getProperty("/countNotOk");
                    oContext.getModel().setProperty(oContext.getPath() + "/AllocatedQuantity", allocatedQuantity); // Update local model

                    oModel.setProperty("/countNotOk", countNotOk + 1);
                    oEvent.getSource().setEnabled(false); // Disable the "Not in Stock" button
                    var approveButton = oItem.getCells()[5].getItems()[0]; // Get the "Approve" button
                    if (approveButton) {
                        approveButton.setEnabled(false);
                    }



                },
                error: function () {
                    MessageToast.show("Failed to update stock status.");
                }
            });
        },

        onAllocate: function (oEvent) {
            var oItem = oEvent.getSource().getParent().getParent(); // Get the parent ColumnListItem
            var oContext = oItem.getBindingContext("storeModel");
            var oModel = this.getView().getModel("storeModel");
        
            var sMaterialID = oContext.getProperty("ID");
            var allocatedQuantity = oItem.getCells()[4].getValue(); // Get the value from the Input field (Allocated Quantity)
        
            if (!sMaterialID || !allocatedQuantity) {
                MessageToast.show("Missing data.");
                return;
            }
        
            var sMaterialUrl = "/odata/v4/stock/T_material('" + sMaterialID + "')";
            var that = this;
        
            $.ajax({
                url: sMaterialUrl,
                type: "PATCH",
                contentType: "application/json",
                data: JSON.stringify({
                    IsMaterialAllocate: true,
                    AllocatedQuantity: allocatedQuantity // Update the allocated quantity
                }),
                success: function () {
                    MessageToast.show("Material allocated successfully!");
                    oContext.getModel().setProperty(oContext.getPath() + "/IsMaterialAllocate", true);
                    oContext.getModel().setProperty(oContext.getPath() + "/AllocatedQuantity", allocatedQuantity); // Update local model
        
                    // Update countOk after successful allocation
                    let countOk = oModel.getProperty("/countOk");
                    oModel.setProperty("/countOk", countOk + 1);
        
                    // Optionally, disable the button after allocation
                    oEvent.getSource().setEnabled(false);
                    // Optionally, disable the button after allocation

                    var notInStockButton = oItem.getCells()[5].getItems()[1]; // Get the "Not in Stock" button
                    if (notInStockButton) {
                        notInStockButton.setEnabled(false);
                    }
                },
                error: function () {
                    MessageToast.show("Failed to allocate material.");
                }
            });
        },
        
        _evaluateRequestStatus: function (sRequestID) {
            var sUrl = "/odata/v4/stock/T_material?$filter=Request_ID eq '" + sRequestID + "' and IsOptionalAllow eq true";
            var that = this;
        
            $.ajax({
                url: sUrl,
                method: "GET",
                success: function (oData) {
                    var aMaterials = oData.value;
        
                    // Check how many are allocated / not allocated
                    var allAllocated = aMaterials.every(m => m.IsMaterialAllocate === true);
                    var anyNotAllocated = aMaterials.some(m => m.IsMaterialAllocate === false);
        
                    let newStatus = "";
        
                    if (allAllocated) {
                        newStatus = "CLOSED";
                    } else if (anyNotAllocated) {
                        newStatus = "P_CLOSED";
                    } else {
                        newStatus = "INPROCESS"; // Fallback (can happen if no materials processed yet)
                    }
        
                    if (newStatus) {
                        var sUpdateUrl = "/odata/v4/stock/T_Request('" + sRequestID + "')";
                        $.ajax({
                            url: sUpdateUrl,
                            type: "PATCH",
                            contentType: "application/json",
                            headers: {
                                "TriggeredBy": "storemanager" // 👈 custom header added
                            },
                            data: JSON.stringify({
                                RequestStatus: newStatus
                            }),
                            success: function () {
                                MessageToast.show("Request status updated to " + newStatus);
                                
                                // Reset counts
                                var oModel = that.getView().getModel("storeModel");
                                oModel.setProperty("/countOk", 0);
                                oModel.setProperty("/countNotOk", 0);
                            },
                            error: function () {
                                MessageToast.show("Failed to update request status.");
                            }
                        });
                    }
                },
                error: function () {
                    MessageToast.show("Failed to evaluate request status.");
                }
            });
        },
        
        onSubmitStoreDecision: function () {
            const oModel = this.getView().getModel("storeModel");
            const requestId = oModel.getProperty("/selectedRequest/ID");

            if (!requestId) {
                MessageToast.show("No request selected.");
                return;
            }

            this._evaluateRequestStatus(requestId);
            oModel.setProperty("/countOk", 0);
            oModel.setProperty("/countNotOk", 0);
        },
        onInputChange: function (oEvent) {
            var oInput = oEvent.getSource();
            var value = oInput.getValue();
        
            // Validate input
            if (!value || isNaN(value) || Number(value) <= 0) {
                // If invalid, show error message and set the input state
                MessageToast.show("Please enter a valid positive number.");
                oInput.setValueState("Error"); // Highlight input in error state
                oInput.setValueStateText("Invalid input. Must be a positive number.");
            } else {
                // If valid, reset the input state
                oInput.setValueState("None");
            }
        },
        
        onBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        }
    });
});
