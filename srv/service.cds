using stock from '../db/schema'; // only one import needed now

service StockService {

  entity Employees as projection on stock.Employees;
  entity T_Request as projection on stock.T_Request;
  entity T_material as projection on stock.T_material;
  entity MaterialMaster as projection on stock.MaterialMaster;
//  entity RequestSummary as projection on stock.RequestSummary;
  
entity RequestSummary as projection on stock.RequestSummary {
  ID,                                 // 👈 include the key field!
  RequestID,
  RequestStatus,
  ActionTaken,
  RequestCreatedBy,
  RequestUpdatedBy,
  createdAt as CreatedAt,
  Details
}
  entity RequestSummaryDetails as projection on stock.MaterialSummaryDetails;

  function getRequestId(EmployeeID: String(10), ReqTitle: String(100)) returns UUID;

  function getMaterialsByType(materialType: String(50)) returns array of stock.MaterialDetails;

  action approveMaterials(
    requestID: UUID,
    selectedMaterials: many UUID,
    supervisorComment: String
  ) returns String;
}
