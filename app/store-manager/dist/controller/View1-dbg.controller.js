sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("storemanager.controller.View1", {
        onInit: function () {
            const oModel = new JSONModel({
                requestList: [],
                statusCounts: {
                    CREATED: 0,
                    INPROCESS: 0,
                    P_CLOSED: 0,
                    CLOSED: 0,
                    REJECTED: 0
                },
                RequesterNames: [],
                SupervisorNames: [],
                selectedRequest: null
            });
            this.getView().setModel(oModel, "storeModel");
            this._fetchApprovedRequests();
        },
        

        _fetchApprovedRequests: function () {
            const oModel = this.getView().getModel("storeModel");
            $.ajax({
                url: "/odata/v4/stock/T_Request?$filter=RequestStatus eq 'INPROCESS' or RequestStatus eq 'P_CLOSED' or RequestStatus eq 'CLOSED'",
                method: "GET",
                success: function (data) {
                    oModel.setProperty("/requestList", data.value);
                    this._updateKPICounts(data.value);
        
                    // Extract unique names
                    const uniqueRequesters = [...new Set(data.value.map(item => item.ReqRaisedByEmployeeName))]
                        .map(name => ({ ReqRaisedByEmployeeName: name }));
                    const uniqueSupervisors = [...new Set(data.value.map(item => item.EmployeeSupervisor))]
                        .map(name => ({ EmployeeSupervisor: name }));
        
                    oModel.setProperty("/RequesterNames", uniqueRequesters);
                    oModel.setProperty("/SupervisorNames", uniqueSupervisors);
        
                }.bind(this),
                error: function () {
                    MessageToast.show("Failed to fetch requests!");
                }
            });
        },
        
        onAfterRendering: function () {
            this.byId("reqNameCombo").setForceSelection(false);
            this.byId("supNameCombo").setForceSelection(false);
        },
        

        _updateKPICounts: function (requests) {
            const oModel = this.getView().getModel("storeModel");
            const counts = {
                CLOSED: requests.filter(req => req.RequestStatus === "CLOSED").length,
                INPROCESS: requests.filter(req => req.RequestStatus === "INPROCESS").length,
                P_CLOSED: requests.filter(req => req.RequestStatus === "P_CLOSED").length,
                CREATED: 0, // Add logic for CREATED if needed
                REJECTED: 0 // Add logic for REJECTED if needed
            };
            oModel.setProperty("/statusCounts", counts);
        },

        onRequestSelect: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("listItem");
            if (!oSelectedItem) return;

            const oCtx = oSelectedItem.getBindingContext("storeModel");
            const requestId = oCtx.getProperty("ID");

            // Navigate to material view with request ID
            this.getOwnerComponent().getRouter().navTo("Material1", {
                requestId: requestId
            });
        },

        onSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue"); // Get the search query
            const oFilter = [];

            if (sQuery) {
                const oFilter1 = new Filter("ReqTitle", FilterOperator.Contains, sQuery);
                const oFilter2 = new Filter("ReqRaisedByEmployeeName", FilterOperator.Contains, sQuery);
                const oFilter3 = new Filter("EmployeeSupervisor", FilterOperator.Contains, sQuery);
                
                oFilter.push(new Filter({
                    filters: [oFilter1, oFilter2, oFilter3],
                    and: false // Use OR logic between filters
                }));
            }

            // Update binding with filter
            const oTable = this.byId("requestTable");
            const oBinding = oTable.getBinding("items");
            oBinding.filter(oFilter);
        },

        onFilterChange: function (oEvent) {
            const sSelectedKey = oEvent.getParameter("selectedItem").getKey();
            const oTable = this.byId("requestTable");
            const oBinding = oTable.getBinding("items");
            const aFilters = [];

            if (sSelectedKey) {
                const oFilter = new Filter("RequestStatus", FilterOperator.EQ, sSelectedKey);
                aFilters.push(oFilter);
            }

            oBinding.filter(aFilters); // Apply the selected filter
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
        
        onResetFilters: function () {
            const oView = this.getView();
            oView.byId("reqNameCombo").setSelectedKey("");
            oView.byId("supNameCombo").setSelectedKey("");
            oView.byId("reqStatusSelect").setSelectedKey("");
        
            this.onFilterRequestHistory();
        }
        
    });
});
