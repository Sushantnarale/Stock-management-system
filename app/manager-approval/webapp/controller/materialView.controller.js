sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageBox, MessageToast) {
    "use strict";

    return Controller.extend("managerapproval.controller.materialView", {
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteToActionByManager").attachPatternMatched(this._onRouteMatched, this);

            var oData = {
                materials: [],
                editable: true // default

            };
            this.reqModel1 = new JSONModel(oData);
            this.getView().setModel(this.reqModel1, "reqModel1");
        },

        _onRouteMatched: function (oEvent) {
            var sReqId = decodeURIComponent(oEvent.getParameter("arguments").ReqId);
            this._fetchMaterialDetails(sReqId);
        },

        _fetchMaterialDetails: function (sRequestID) {
            var that = this;
            var oModel = this.getOwnerComponent().getModel();
            var sMaterialUrl = oModel.sServiceUrl + "/T_material?$filter=Request_ID eq '" + encodeURIComponent(sRequestID) + "'";
            var sRequestUrl = oModel.sServiceUrl + "/T_Request('" + sRequestID + "')";
        
            // Fetch request header first
            $.ajax({
                url: sRequestUrl,
                method: "GET",
                success: function (oRequestResponse) {
                    that.reqModel1.setProperty("/requestHeader", oRequestResponse);
        
                    // Fetch materials after request header is loaded
                    $.ajax({
                        url: sMaterialUrl,
                        method: "GET",
                        success: function (oMaterialResponse) {
                            const requestStatus = oRequestResponse.RequestStatus;
                            const isEditable = !(requestStatus === "CLOSED" || requestStatus === "P_CLOSED" || requestStatus === "REJECTED");
        
                            oMaterialResponse.value.forEach(function (item) {
                                item.selected = true;
                                item.editable = isEditable; // set editable flag for the view
                            });
        
                            that.reqModel1.setProperty("/materials", oMaterialResponse.value);
                        },
                        error: function () {
                            MessageToast.show("Failed to fetch material details.");
                        }
                    });
                },
                error: function () {
                    MessageToast.show("Failed to fetch request details.");
                }
            });
        },
        
        
        onAccept: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("reqModel1");
            var oModel = this.getView().getModel();

            var sMaterialID = oContext.getProperty("ID");
            var iNewQuantity = oContext.getProperty("Quantity");
            var sRequestID = oContext.getProperty("Request_ID");

            if (!sMaterialID || !iNewQuantity || iNewQuantity <= 0 || !sRequestID || !oModel) {
                MessageToast.show("Invalid data.");
                return;
            }

            var sMaterialUpdateUrl = oModel.sServiceUrl + "/T_material('" + sMaterialID + "')";
            var sRequestUpdateUrl = oModel.sServiceUrl + "/T_Request('" + sRequestID + "')";

            $.ajax({
                url: sMaterialUpdateUrl,
                type: "PATCH",
                contentType: "application/json",
                data: JSON.stringify({
                    IsOptionalAllow: true,
                    IsMaterialAllocate: false,
                    Quantity: iNewQuantity
                }),
                success: function () {
                    oContext.getModel().setProperty(oContext.getPath() + "/IsOptionalAllow", true);
                    oEvent.getSource().setEnabled(false); // Disable the "Not in Stock" button
                    var approveButton = oContext.getCells()[5].getItems()[0]; // Get the "Approve" button
                    if (approveButton) {
                        approveButton.setEnabled(false);
                    }

                },
                
            });
        },

        onReject: function (oEvent) {
            var oContext = oEvent.getSource().getParent().getParent().getBindingContext("reqModel1");
            var oModel = this.getView().getModel();
            var sMaterialID = oContext.getProperty("ID");
            var sRequestID = oContext.getProperty("Request_ID");

            if (!sMaterialID || !sRequestID || !oModel) {
                MessageToast.show("Invalid data.");
                return;
            }

            var that = this;
            var sMaterialUpdateUrl = oModel.sServiceUrl + "/T_material('" + sMaterialID + "')";

            $.ajax({
                url: sMaterialUpdateUrl,
                type: "PATCH",
                contentType: "application/json",
                data: JSON.stringify({
                    IsOptionalAllow: false,
                    IsMaterialAllocate: false
                }),
                success: function () {
                    var sAllMaterialsUrl = oModel.sServiceUrl + "/T_material?$filter=Request_ID eq '" + encodeURIComponent(sRequestID) + "'";
                    $.ajax({
                        url: sAllMaterialsUrl,
                        method: "GET",
                        success: function (oResponse) {
                            oContext.getModel().setProperty(oContext.getPath() + "/IsOptionalAllow", false);
                            oEvent.getSource().setEnabled(false); // Disable the "Not in Stock" button
                            var approveButton = oItem.getCells()[5].getItems()[0]; // Get the "Approve" button
                            if (approveButton) {
                                approveButton.setEnabled(false);
                            }

                        }
                    });
                },
                error: function (e) {
                    console.error(e);
                    MessageToast.show("Material rejection failed.");
                }
            });
        },

        onSubmitManager: function () {
            var oModel = this.getView().getModel();
            var oTextArea = this.getView().byId("supervisorComment");
            var sComment = oTextArea.getValue();
        
            if (!sComment || sComment.trim() === "") {
                MessageToast.show("Please enter a comment.");
                return;
            }
        
            var aItems = this.getView().byId("MaterialDetails").getItems();
            if (aItems.length === 0) {
                MessageToast.show("No materials found.");
                return;
            }
        
            var sRequestID = aItems[0].getBindingContext("reqModel1").getProperty("Request_ID");
            var sAllMaterialsUrl = oModel.sServiceUrl + "/T_material?$filter=Request_ID eq '" + encodeURIComponent(sRequestID) + "'";
            var sRequestUpdateUrl = oModel.sServiceUrl + "/T_Request('" + sRequestID + "')";
        
                   
                    // Step 1 and 2: Check Material Status and  Submit Supervisor Comment
 
                    $.ajax({
                        url: sAllMaterialsUrl,
                        method: "GET",
                        success: function (oResponse) {
                            var allRejected = oResponse.value.every(function (mat) {
                                return mat.IsOptionalAllow === false && mat.IsMaterialAllocate === false;
                            });
        
                            var newStatus = allRejected ? "REJECTED" : "INPROCESS";
        
                            // Step 3: Update Request Status
                            $.ajax({
                                url: sRequestUpdateUrl,
                                type: "PATCH",
                                contentType: "application/json",
                                headers: {
                                    "TriggeredBy": "manager" //  custom header added
                                },
                                data: JSON.stringify({
                                    SupervisorComments: sComment,
                                    RequestStatus: newStatus,

                                  }),                               
                                   success: function () {
                                    oTextArea.setValue("");
                                    MessageToast.show("Supervisor comment submitted. Request marked as " + newStatus + ".");
                                },
                                error: function (e) {
                                    console.error(e);
                                    MessageToast.show("Comment submitted but failed to update request status.");
                                }
                            });
                        },
                        error: function () {
                            MessageToast.show("Comment submitted but failed to fetch materials.");
                        }
                    });
                
        
        },
        

        onNavBack: function () {
            this.getOwnerComponent().getRouter().navTo("RouteView1");
        }
    });
});
