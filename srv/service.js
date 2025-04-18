const cds = require('@sap/cds');

module.exports = (srv) => {

  // Auto-generate custom RequestID
  srv.before("CREATE", "T_Request", async (req) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const likePattern = `STK-${year}-${month}-%`;

    const result = await cds.run(
      SELECT.one.from("stock.T_Request")
        .columns("RequestID")
        .where(`RequestID like '${likePattern}'`)
        .orderBy('RequestID desc')
    );

    let count = 1;
    if (result?.RequestID) {
      const last = result.RequestID.split('-').pop();
      count = parseInt(last, 10) + 1;
    }

    req.data.RequestID = `STK-${year}-${month}-${String(count).padStart(3, '0')}`;
  });

  // Get Request ID by EmployeeID + Title
  srv.on("getRequestId", async (req) => {
    const { EmployeeID, ReqTitle } = req.data;

    const result = await cds.run(
      SELECT.one("ID").from("stock.T_Request")
        .where({ EmployeeID, ReqTitle })
    );

    return result ? result.ID : null;
  });

//   //Get Materials by Type from MaterialMaster
//   srv.on("getMaterialsByType", async (req) => {
//     const { materialType } = req.data;

//     const materials = await cds.run(
//       SELECT.from("stock.MaterialMaster").where({ MaterialType: materialType })
//     );

//     return materials.map(mat => ({
//       ID: mat.ID,
//       MaterialType: mat.MaterialType,
//       MaterialName: mat.MaterialName,
//       Unit: mat.Unit
//     }));
// });


//   // Approve materials and update request status
//   srv.on('approveMaterials', async (req) => {
//     const { requestID, selectedMaterials, supervisorComment } = req.data;
//     const db = cds.transaction(req);

//     try {
//       if (selectedMaterials?.length > 0) {
//         await db.update('stock.T_material')
//           .set({ IsMaterialAllocate: true })
//           .where({ ID: { in: selectedMaterials } });
//       }

//       const allMaterials = await db.run(
//         SELECT.from('stock.T_material').where({ Request_ID: requestID })
//       );

//       const totalCount = allMaterials.length;
//       const approvedCount = allMaterials.filter(m => m.IsMaterialAllocate).length;

//       let newStatus = "INPROCESS";
//       if (approvedCount === totalCount && totalCount > 0) {
//         newStatus = "CLOSED";
//       } else if (approvedCount > 0) {
//         newStatus = "P_CLOSED";
//       }

//       await db.update('stock.T_Request')
//         .set({
//           RequestStatus: newStatus,
//           SupervisorComments: supervisorComment
//         })
//         .where({ ID: requestID });

//       return { message: "Approval completed", status: newStatus };

//     } catch (error) {
//       console.error("Approval Error:", error);
//       req.error(500, `Error updating status: ${error.message}`);
//     }
//   });



  //req create summary 
  srv.after("CREATE", "T_Request", async (createdData, req) => {
    try {
      const { ID } = createdData;
  
      // 1. Fetch full request + materials using composition/association
      const [request, materials] = await Promise.all([
        cds.run(SELECT.one.from('stock.T_Request').where({ ID })),
        cds.run(SELECT.from('stock.T_material').where({ Request_ID: ID }))
      ]);
  
      if (!request) {
        console.error("T_Request not found for ID:", ID);
        return;
      }
  
      // 2. Create RequestSummary entry
      const summaryEntry = {
        RequestID: request.RequestID,
        RequestCreatedBy: request.ReqRaisedByEmployeeName || "Unknown",
        RequestUpdatedBy: "Employee",
        ActionTaken: "Request Created by "+request.ReqRaisedByEmployeeName,
        RequestStatus: request.RequestStatus,
      };
  
      const insertResult = await cds.run(INSERT.into("stock.RequestSummary").entries(summaryEntry));
  
      // 3. Fetch the generated summary ID (if needed)
      const summaryID = insertResult?.ID || (
        await cds.run(SELECT.one.from("stock.RequestSummary").where({ RequestID: request.RequestID }))
      )?.ID;
  
      // 4. Map each material to MaterialSummaryDetails
      const detailEntries = materials.map(mat => ({
        summary_ID: summaryID,
        MaterialType: mat.MaterialType || "",
        MaterialRequired: mat.MaterialName || "",  // or use MaterialName
        Reason: mat.Reason || "",
        Unit: mat.Unit || "",
        Quantity: mat.Quantity || 0,
        AllocatedQuantity: mat.AllocatedQuantity || 0,
        ApprovedByManager: mat.IsMaterialAllocate || false,
        AllocatedByStoreMgr: false, // default at request time
        TakeAction: "CREATED"
      }));
  
      if (detailEntries.length > 0) {
        await cds.run(INSERT.into("stock.MaterialSummaryDetails").entries(detailEntries));
      }
  
      console.log("Summary + Details created for request", request.RequestID);
  
    } catch (err) {
      console.error("Error writing RequestSummary/Details:", err);
    }
  });



  //patch req MANAGER||STORE MANAGER
  srv.after('UPDATE', 'T_Request', async (data, req) => {
    try {
      const { T_material, RequestSummary } = cds.entities('stock');
      const triggeredBy = req.headers["triggeredby"]?.toLowerCase() || "manager"; // normalize just in case
      // Fetch the updated request
      const request = await cds.run(SELECT.one.from('stock.T_Request').where({ ID: data.ID }));
      if (!request) {
        console.log("No matching T_Request for ID:", data.ID);
        return;
      }

      let requestUpdatedBy, actionTaken;
  
      if (triggeredBy === "storemanager") {
        requestUpdatedBy = "Store Manager";
        actionTaken = "Request materials processed by Store Manager";
      } else {
        requestUpdatedBy = "Manager";
        actionTaken = "Request is supervised by " + (request.EmployeeSupervisor || "Supervisor");
      }
  
     
      // Conditionally allow execution based on changes
      const updatedComment = data.SupervisorComments !== undefined;
      const updatedStatus = data.RequestStatus !== undefined;
      if (!updatedComment && !updatedStatus) {
        console.log("No significant fields updated.");
        return;
      }
  
      //  Fetch associated materials
      const materials = await cds.run(SELECT.from(T_material).where({ Request_ID: request.ID }));
      console.log("Found materials:", materials.length);
  
      // Prepare summary entry
      const summaryEntry = {
        RequestID: request.RequestID,
        RequestCreatedBy: request.ReqRaisedByEmployeeName || "Unknown",
        RequestUpdatedBy: requestUpdatedBy,
        ActionTaken: actionTaken,
        RequestStatus: data.RequestStatus || request.RequestStatus,
        Details: materials.map(mat => ({
          ID: cds.utils.uuid(),
          MaterialType: mat.MaterialType || "",
          MaterialRequired: mat.MaterialName || "",
          Reason: mat.Reason || "",
          Unit: mat.Unit || "",
          Quantity: mat.Quantity || 0,
          AllocatedQuantity: mat.AllocatedQuantity || 0,
          ApprovedByManager: mat.IsOptionalAllow || false,
          AllocatedByStoreMgr: mat.IsMaterialAllocate || false,
          TakeAction:
          triggeredBy === "storemanager"
            ? (!mat.IsOptionalAllow ? "Rejected by Manager"
              : mat.IsMaterialAllocate ? "Approved by Store" : "Not in Stock")
            : (!mat.IsOptionalAllow ? "Rejected by Manager" : "Accepted by Manager")
        
        }))
      };
  
      // Insert into RequestSummary (composition handles sub-entries)
      await cds.run(INSERT.into(RequestSummary).entries(summaryEntry));
      console.log(` ${triggeredBy} summary written for`, request.RequestID);
  
    } catch (err) {
      console.error(" Error in PATCH after hook (summary):", err);
    }
  });
  
};
