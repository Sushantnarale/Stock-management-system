sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, MessageToast, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("managerapproval.controller.View1", {
        onInit: function () {
            const that = this;
            const reqModel = new JSONModel({
                RequestID: "",
                uniqueReqId: "",
                requestList: [],
                RequestStatus: "",
                ReqRaisedByEmployeeName: "",
                EmployeeSupervisor: "",
                EmployeeID: "",
                todayDate: "",
                RequesterNames: [],
                SupervisorNames: [],
                reqData: {
                    EmployeeID: "",
                    EmployeeSupervisor: "",
                    RequestID: "",
                    ReqRaisedByEmployeeName: "",
                    ReqRaisedOn: "",
                    ReqTitle: "",
                    RequestStatus: "",
                    SupervisorComments: "",
                    material: []
                }
            });

            this.getView().setModel(reqModel, "reqModel");

            const serviceUrl = this.getOwnerComponent().getModel().getServiceUrl();

            $.ajax({
                url: `${serviceUrl}T_Request`,
                type: "GET",
                contentType: "application/json",
                success: function (response) {
                    reqModel.setProperty("/requestList", response.value);

                    // Extract unique requester and supervisor names from response data
                    const uniqueRequesterNames = [...new Set(response.value.map(item => item.ReqRaisedByEmployeeName))]
                        .map(name => ({ ReqRaisedByEmployeeName: name }));
                    const uniqueSupervisorNames = [...new Set(response.value.map(item => item.EmployeeSupervisor))]
                        .map(name => ({ EmployeeSupervisor: name }));

                    reqModel.setProperty("/RequesterNames", uniqueRequesterNames);
                    reqModel.setProperty("/SupervisorNames", uniqueSupervisorNames);

                    that.calculateStatusCounts();
                },
                error: function (xhr, status, error) {
                    MessageToast.show("Failed to fetch data.");
                    console.error("Fetch error:", error);
                }
            });
        },

        onResetFilters: function () {
            const oView = this.getView();
            oView.byId("reqNameCombo").setSelectedKey("");
            oView.byId("supNameCombo").setSelectedKey("");
            oView.byId("reqStatusSelect").setSelectedKey("");
            this.onFilterRequestHistory();
        },

        onFilterRequestHistory: function () {
            const oView = this.getView();
            const oTable = oView.byId("requestTable");
            const oBinding = oTable.getBinding("items");

            const reqName = oView.byId("reqNameCombo").getSelectedKey();
            const supName = oView.byId("supNameCombo").getSelectedKey();
            const reqStatus = oView.byId("reqStatusSelect").getSelectedKey();

            const aFilters = [];

            if (reqName) {
                aFilters.push(new Filter("ReqRaisedByEmployeeName", FilterOperator.EQ, reqName));
            }
            if (supName) {
                aFilters.push(new Filter("EmployeeSupervisor", FilterOperator.EQ, supName));
            }
            if (reqStatus) {
                aFilters.push(new Filter("RequestStatus", FilterOperator.EQ, reqStatus));
            }

            if (oBinding) {
                oBinding.filter(aFilters);
            }
        },

        onActionPress: function (oEvent) {
            const oButton = oEvent.getSource();
            const oContext = oButton.getBindingContext("reqModel");
            const that = this;

            if (oContext) {
                const oData = oContext.getObject();
                const EmployeeID = oData.EmployeeID;
                const ReqTitle = oData.ReqTitle;

                const serviceUrl = this.getOwnerComponent().getModel().getServiceUrl();
                const url = `${serviceUrl}getRequestId(EmployeeID='${encodeURIComponent(EmployeeID)}',ReqTitle='${encodeURIComponent(ReqTitle)}')`;

                $.ajax({
                    type: "GET",
                    contentType: "application/json",
                    url: url,
                    dataType: "json",
                    success: function (data) {
                        if (data && data.value) {
                            MessageToast.show("Request ID: " + data.value);
                            const oRouter = that.getOwnerComponent().getRouter();
                            oRouter.navTo("RouteToActionByManager", {
                                ReqId: data.value
                            });
                        } else {
                            MessageToast.show("No Request Found");
                        }
                    },
                    error: function (xhr, status, error) {
                        console.error("Error fetching Request ID:", error);
                        MessageToast.show("Error fetching Request ID.");
                    }
                });
            } else {
                MessageToast.show("No data found!");
            }
        },

        calculateStatusCounts: function () {
            const oModel = this.getView().getModel("reqModel");
            const aRequests = oModel.getProperty("/requestList");

            const counts = {
                CREATED: 0,
                CLOSED: 0,
                P_CLOSED: 0,
                INPROCESS: 0,
                REJECTED: 0
            };

            aRequests.forEach((req) => {
                const status = req.RequestStatus;
                if (counts[status] !== undefined) {
                    counts[status]++;
                }
            });

            oModel.setProperty("/statusCounts", counts);
        },

        statusStateFormatter: function (sStatus) {
            switch (sStatus) {
                case "INPROCESS":
                    return "Warning";
                case "CREATED":
                    return "Information";
                case "REJECTED":
                    return "Error";
                case "P_CLOSED":
                    return "Warning";
                case "CLOSED":
                    return "Success";
                default:
                    return "None";
            }
        },

        cardStatusColorFormatter: function (sCountPath) {
            switch (sCountPath) {
                case "CREATED":
                    return "statusBlack";
                case "INPROCESS":
                    return "statusGreen";
                case "P_CLOSED":
                    return "statusYellow";
                case "CLOSED":
                    return "statusGreen";
                case "REJECTED":
                    return "statusRed";
                default:
                    return "";
            }
        }
    });
});
