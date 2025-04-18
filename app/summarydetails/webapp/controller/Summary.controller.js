sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment"
  ], function (Controller, JSONModel, MessageToast, Fragment) {
    "use strict";
  
    return Controller.extend("summarydetails.controller.Summary", {
      onInit: function () {
        this.getOwnerComponent().getRouter().getRoute("RouteSummary")
          .attachPatternMatched(this._onRouteMatched, this);
      },
  
      _onRouteMatched: function (oEvent) {
        const sRequestID = oEvent.getParameter("arguments").RequestID;
        this._sRequestID = sRequestID;
  
        const oDataModel = this.getOwnerComponent().getModel();
        const sUrl = `${oDataModel.sServiceUrl}RequestSummary?$expand=Details&$filter=RequestID eq '${sRequestID}'`;
  
        $.ajax({
          url: sUrl,
          method: "GET",
          success: (data) => {
            if (data.value.length > 0) {
              const oModel = new JSONModel(data.value);
              this.getView().setModel(oModel, "summary");
            } else {
              MessageToast.show("No summary found for this request.");
            }
          },
          error: () => {
            MessageToast.show("Failed to fetch summary data.");
          }
        });
      },
  
      onShowMaterials: function (oEvent) {
        const oContext = oEvent.getSource().getBindingContext("summary");
        const aDetails = oContext.getProperty("Details");
  
        const oMaterialModel = new JSONModel(aDetails);
        this.getView().setModel(oMaterialModel, "material");
  
        if (!this._pDialog) {
          Fragment.load({
            name: "summarydetails.view.MaterialDialog",
            controller: this
          }).then((oDialog) => {
            this._pDialog = oDialog;
            this.getView().addDependent(this._pDialog);
            this._pDialog.open();
          });
        } else {
          this._pDialog.open();
        }
      },
      formatDateToDDMMYYYY: function (sDate) {
        if (!sDate) return "";
        const date = new Date(sDate);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    },
    
  
      onCloseDialog: function () {
        this._pDialog.close();
      },
  
      onNavBack: function () {
        history.go(-1);
      }
    });
  });
  