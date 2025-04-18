sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], (Controller, MessageToast, BusyIndicator, JSONModel, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("summarydetails.controller.View1", {

        onInit: function () {
            const reqModel = new JSONModel({
                requestList: [],
                statusCounts: {},
                selectedRequester: "",
                selectedSupervisor: "",
                RequesterNames: [],
                SupervisorNames: [],
                reqData: {
                    EmployeeID: "",
                    ReqRaisedByEmployeeName: "",
                    EmployeeSupervisor: "",
                    EmployeeDepartment: "",
                    ReqRaisedOn: "",
                    ReqTitle: "",
                    RequestStatus: "",
                    SupervisorComments: ""
                }
            });
            this.getView().setModel(reqModel, "reqModel");

            const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;

            // Fetch employees
            $.ajax({
                url: `${serviceUrl}Employees`,
                type: "GET",
                contentType: "application/json",
                success: (response) => {
                    const empModel = new JSONModel(response.value);
                    this.getView().setModel(empModel, "empModel");

                    const names = response.value.map(e => e.EmployeeName);
                    const supervisors = [...new Set(response.value.map(e => e.EmployeeSupervisor))];

                    reqModel.setProperty("/RequesterNames", names.map(n => ({ ReqRaisedByEmployeeName: n })));
                    reqModel.setProperty("/SupervisorNames", supervisors.map(s => ({ EmployeeSupervisor: s })));
                },
                error: () => MessageToast.show("Failed to fetch employee data.")
            });
        },

        onEmployeeSelect: function (oEvent) {
            const selectedKey = oEvent.getParameter("selectedItem")?.getKey();
            const empList = this.getView().getModel("empModel").getProperty("/");
            const emp = empList.find(e => e.EmployeeID === selectedKey);
            const reqModel = this.getView().getModel("reqModel");

            if (emp) {
                const today = new Date().toISOString().split("T")[0];

                reqModel.setProperty("/reqData", {
                    EmployeeID: emp.EmployeeID,
                    ReqRaisedByEmployeeName: emp.EmployeeName,
                    EmployeeSupervisor: emp.EmployeeSupervisor,
                    EmployeeDepartment: emp.EmployeeDepartment,
                    ReqRaisedOn: today
                });

                const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;
                $.ajax({
                    url: `${serviceUrl}T_Request?$filter=EmployeeID eq '${emp.EmployeeID}'`,
                    type: "GET",
                    success: (res) => {
                        reqModel.setProperty("/requestList", res.value || []);
                        this.calculateStatusCounts();
                    },
                    error: () => MessageToast.show("Failed to fetch request history.")
                });
            }
        },

        onPressRequestSummary: function (oEvent) {
            const reqID = oEvent.getSource().getBindingContext("reqModel").getProperty("RequestID");
            if (reqID) {
                this.getOwnerComponent().getRouter().navTo("RouteSummary", { RequestID: reqID });
            }
        },

        onResetFilters: function () {
            const v = this.getView();
          
            v.byId("reqStatusSelect").setSelectedKey("");
            this.onFilterRequestHistory();
        },

        onFilterRequestHistory: function () {
            const v = this.getView();
            const table = v.byId("requestTable");
            const binding = table.getBinding("items");

        
            const reqStatus = v.byId("reqStatusSelect").getSelectedKey();

            const filters = [];

            if (reqStatus) filters.push(new Filter("RequestStatus", FilterOperator.EQ, reqStatus));

            binding.filter(filters);
        },

        calculateStatusCounts: function () {
            const model = this.getView().getModel("reqModel");
            const list = model.getProperty("/requestList") || [];

            const counts = { CREATED: 0, CLOSED: 0, P_CLOSED: 0, INPROCESS: 0, REJECTED: 0 };
            list.forEach(r => counts[r.RequestStatus] = (counts[r.RequestStatus] || 0) + 1);
            model.setProperty("/statusCounts", counts);
        }

    });
});
