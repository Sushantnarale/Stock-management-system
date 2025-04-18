sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel"
], (Controller, MessageToast, BusyIndicator, JSONModel) => {
    "use strict";

    return Controller.extend("requestmaterial.controller.View1", {

        onInit: function () {
            const reqModel = new JSONModel({
                Employees: [],
                requestList: [],
                RequestStatus: "CREATED",
                ReqRaisedByEmployeeName: "",
                EmployeeSupervisor: "",
                EmployeeID: "",
                todayDate: "",
                reqData: {
                    EmployeeID: "",
                    EmployeeSupervisor: "",
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
                url: `${serviceUrl}Employees`,
                type: "GET",
                contentType: "application/json",
                success: (response) => {
                    const empModel = new sap.ui.model.json.JSONModel(response.value);
                    this.getView().setModel(empModel, "empModel");
                },
                error: (xhr, status, error) => {
                    MessageToast.show("Failed to fetch employee data.");
                    console.error("Upload error:", error);
                }
            });

            this.fetchMaterialName();
        },

        onEmployeeSelect: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return; // No selection made (e.g., user cleared the box)
            }
        
            const selectedEmpID = oSelectedItem.getKey();
            const aEmployees = this.getView().getModel("empModel").getProperty("/");
        
            const selectedEmp = aEmployees.find(emp => emp.EmployeeID === selectedEmpID);
        
            if (selectedEmp) {
                const oReqModel = this.getView().getModel("reqModel");
        
                oReqModel.setProperty("/reqData/EmployeeID", selectedEmp.EmployeeID);
                oReqModel.setProperty("/reqData/ReqRaisedByEmployeeName", selectedEmp.EmployeeName);
                oReqModel.setProperty("/reqData/EmployeeSupervisor", selectedEmp.EmployeeSupervisor);
                oReqModel.setProperty("/reqData/EmployeeDepartment", selectedEmp.EmployeeDepartment);
        
                const today = new Date().toISOString().split("T")[0];
                oReqModel.setProperty("/reqData/ReqRaisedOn", today);
            }
        },
              

        onAddMaterial: function () {
            const oModel = this.getView().getModel("reqModel");
            const material = oModel.getProperty("/reqData/material");
        
            // Check if any incomplete row is already there
            const hasIncompleteRow = material.some(item => !item.MaterialName);
            if (hasIncompleteRow) {
                MessageToast.show("Please select Material Name for the previous row before adding a new one.");
                return;
            }
        
            material.push({
                MaterialRequired: "",
                MaterialType: "",
                MaterialID: "",
                MaterialName: "",
                Unit: "",
                Quantity: "",
                AllocatedQuantity: 0,
                Reason: "",
                FromDate: "",
                ToDate: "",
                IsMaterialAllocate: false,
                IsOptionalAllow: false
            });
        
            oModel.setProperty("/reqData/material", material);
        },

        onRemoveMaterial: function (oEvent) {
            const oModel = this.getView().getModel("reqModel");
            const material = oModel.getProperty("/reqData/material");

            const sPath = oEvent.getSource().getBindingContext("reqModel").getPath();
            const index = parseInt(sPath.split("/").pop(), 10);

            if (!isNaN(index) && index >= 0 && index < material.length) {
                material.splice(index, 1);
                oModel.setProperty("/reqData/material", material);
            } else {
                MessageToast.show("Invalid Material selection!");
            }
        },
        onSubmit: function () {
            const oView = this.getView();
            const oModel = oView.getModel("reqModel");
            const reqData = oModel.getProperty("/reqData");
            const todayDate = new Date().toISOString().split("T")[0];
        
            // validate Employee ID
            if (!reqData.EmployeeID) {
                MessageToast.show("Please select an Employee ID.");
                const oEmployeeSelect = oView.byId("EmployeeIDSelect");
                if (oEmployeeSelect) {
                    oEmployeeSelect.setValueState("Error");
                    oEmployeeSelect.setValueStateText("Employee ID is required.");
                }
                return;
            } else {
                oView.byId("EmployeeIDSelect").setValueState("None");
            }
        
            //  Validate other derived employee fields
            if (!reqData.ReqRaisedByEmployeeName || !reqData.EmployeeSupervisor) {
                MessageToast.show("Employee details are incomplete. Please select a valid Employee ID.");
                return;
            }
        
            // 🔍 Validate Request Title
            if (!reqData.ReqTitle) {
                MessageToast.show("Request Title is required!");
                return;
            }
        
            //  Validate at least one material
            if (!reqData.material || reqData.material.length === 0) {
                MessageToast.show("At least one material entry is required!");
                return;
            }
        
            //  Material List Validation
            const materialNamesSet = new Set();
            for (let i = 0; i < reqData.material.length; i++) {
                const item = reqData.material[i];
                if (!item.MaterialName || !item.Quantity || !item.Reason) {
                    MessageToast.show(`Please fill all fields for Material ${i + 1}`);
                    return;
                }
                if (materialNamesSet.has(item.MaterialName)) {
                    MessageToast.show(`Duplicate material "${item.MaterialName}" is not allowed.`);
                    return;
                }
                materialNamesSet.add(item.MaterialName);
            }
        
            // Prepare payload
            const postData = {
                EmployeeID: reqData.EmployeeID,
                EmployeeSupervisor: reqData.EmployeeSupervisor,
                ReqRaisedByEmployeeName: reqData.ReqRaisedByEmployeeName,
                ReqRaisedOn: reqData.ReqRaisedOn || todayDate,
                ReqTitle: reqData.ReqTitle,
                RequestStatus: reqData.RequestStatus || "CREATED",
                SupervisorComments: reqData.SupervisorComments,
                material: reqData.material.map(item => ({
                    MaterialType: item.MaterialType || "",
                    MaterialID: item.MaterialID || "",
                    MaterialName: item.MaterialName || "",
                    Unit: item.Unit || "",
                    Quantity: item.Quantity ? parseInt(item.Quantity, 10) : 0,
                    AllocatedQuantity: 0,
                    Reason: item.Reason || "",
                    FromDate: item.FromDate ? new Date(item.FromDate).toISOString().split("T")[0] : todayDate,
                    ToDate: item.ToDate ? new Date(item.ToDate).toISOString().split("T")[0] : todayDate,
                    IsMaterialAllocate: item.IsMaterialAllocate === true,
                    IsOptionalAllow: item.IsOptionalAllow === true
                }))
            };
        
            // Submit data
            const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;
            const url = `${serviceUrl}T_Request`;
        
            BusyIndicator.show(0);
            $.ajax({
                type: "POST",
                contentType: "application/json",
                url: url,
                data: JSON.stringify(postData),
                success: (response) => {
                    BusyIndicator.hide();
                    MessageToast.show("Request and Materials successfully submitted!");
                    console.log(response);
        
                    oModel.setProperty("/reqData", {
                        EmployeeID: "",
                        EmployeeSupervisor: "",
                        ReqRaisedByEmployeeName: "",
                        ReqRaisedOn: "",
                        ReqTitle: "",
                        RequestStatus: "CREATED",
                        SupervisorComments: "",
                        material: []
                    });
                },
                error: (error) => {
                    BusyIndicator.hide();
                    console.error("Error during data submission:", error.responseText || error);
                    MessageToast.show("Failed to submit data. Please check the console.");
                }
            });
        },
        

      
        fetchMaterialName: function () {
            const serviceUrl = this.getOwnerComponent().getModel().sServiceUrl;

            $.ajax({
                url: `${serviceUrl}MaterialMaster`,
                type: "GET",
                contentType: "application/json",
                success: (response) => {
                    const allMaterials = response.value;

                    const materialModel = new JSONModel({
                        MaterialNames: allMaterials.map(item => ({
                            MaterialName: item.MaterialName,
                            MaterialID: item.MaterialID,
                            MaterialType: item.MaterialType,
                            Unit: item.Unit
                        })),
                        AllMaterials: allMaterials
                    });

                    this.getView().setModel(materialModel, "materialModel");
                },
                error: (xhr, status, error) => {
                    MessageToast.show("Failed to fetch material names.");
                    console.error("Error:", error);
                }
            });
        },

        onMaterialNameChange: function (oEvent) {
            const selectedName = oEvent.getSource().getSelectedKey();
            const materialModel = this.getView().getModel("materialModel");
            const allMaterials = materialModel.getProperty("/AllMaterials");
        
            const selectedMaterial = allMaterials.find(item => item.MaterialName === selectedName);
            const oContext = oEvent.getSource().getBindingContext("reqModel");
            const path = oContext.getPath();
            const rowIndex = parseInt(path.split("/").pop());
        
            const reqModel = this.getView().getModel("reqModel");
            const materialList = reqModel.getProperty("/reqData/material");
        
            // Check for duplicate MaterialName
            const isDuplicate = materialList.some((item, index) => item.MaterialName === selectedName && index !== rowIndex);
            if (isDuplicate) {
                MessageToast.show("This material is already selected. Please choose a different one.");
                // Reset the current row values
                materialList[rowIndex].MaterialName = "";
                materialList[rowIndex].MaterialID = "";
                materialList[rowIndex].Unit = "";
                materialList[rowIndex].MaterialType = "";
                reqModel.refresh(true);
                return;
            }
        
            if (selectedMaterial) {
                const oRowData = oContext.getObject();
                oRowData.MaterialID = selectedMaterial.MaterialID;
                oRowData.Unit = selectedMaterial.Unit;
                oRowData.MaterialType = selectedMaterial.MaterialType;
                oRowData.MaterialName = selectedMaterial.MaterialName;
        
                reqModel.refresh(true);
            }
        }
        

    });
});
