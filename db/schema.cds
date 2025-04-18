namespace stock;

using { cuid, managed } from '@sap/cds/common';

type MaterialDetails {
  ID           : UUID;
  MaterialType : String;
  MaterialName : String;
  Unit         : String;
}

entity Employees : cuid, managed {
    EmployeeID         : String(10);
    EmployeeName       : String(100);
    EmployeeEmail      : String(100);
    EmployeeDepartment : String(100);
    EmployeeSupervisor : String(100);
}

entity T_Request : cuid, managed {
    RequestID              : String(20);
    EmployeeID             : String(10);
    ReqRaisedByEmployeeName: String(100);
    ReqRaisedOn            : Date;
    ReqTitle               : String(100);
    EmployeeSupervisor     : String(100);
    RequestStatus          : String(20);
    SupervisorComments     : String(255);
    material               : Composition of many T_material on material.Request = $self;
}

entity T_material : cuid, managed {
    MaterialType        : String(50);
    MaterialID          : String(10);
    MaterialName        : String(100);
    Unit                : String(20);
    Quantity            : Integer;
    AllocatedQuantity   : Integer default 0;
    Reason              : String(255);
    FromDate            : Date;
    ToDate              : Date;
    IsMaterialAllocate  : Boolean;
    IsOptionalAllow     : Boolean;
    Request             : Association to T_Request;
}

entity MaterialMaster : cuid, managed {
    key MaterialID   : String(10);
    MaterialType     : String(50);
    MaterialName     : String(100);
    Unit             : String(20);
}


entity RequestSummary : cuid, managed {
    RequestID         : String(20);
    RequestCreatedBy  : String(100);
    RequestUpdatedBy  : String(100);
    ActionTaken       : String(50);        
    RequestStatus     : String(20);       
    Details           : Composition of many MaterialSummaryDetails on Details.summary = $self;
}

entity MaterialSummaryDetails : cuid {
    summary              : Association to RequestSummary;
    MaterialType        : String(50);
    MaterialRequired     : String(100);    // Material Name or ID
    Reason               : String(255);
    Unit                 : String(20);
    Quantity             : Integer;
    AllocatedQuantity    : Integer;
    ApprovedByManager    : Boolean;        // Yes (true) / No (false)
    AllocatedByStoreMgr  : Boolean;        // Yes (true) / No (false)
    TakeAction           : String(50);     
}
