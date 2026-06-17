const sequelize = require('../config/db');
const User = require('./User');
const Client = require('./Client');
const Site = require('./Site');
const Labour = require('./Labour');
const Material = require('./Material');
const SiteMaterial = require('./SiteMaterial');
const Payment = require('./Payment');
const Payee = require('./Payee');
const WeeklyPaySheet = require('./WeeklyPaySheet');
const WeeklyPaySheetItem = require('./WeeklyPaySheetItem');
const SiteWorkValue = require('./SiteWorkValue');
const ShiftMaster = require('./ShiftMaster');
const AttendanceSheet = require('./AttendanceSheet');
const AttendanceRecord = require('./AttendanceRecord');
const AttendanceMisc = require('./AttendanceMisc');
const PersonType = require('./PersonType');
const MaterialType = require('./MaterialType');
const PettyCash = require('./PettyCash');
const PersonalExpense = require('./PersonalExpense');
const ActionLog = require('./ActionLog');
const SiteSection = require('./SiteSection');
const SiteProject = require('./SiteProject');

// Associations

// Client <-> Site (1:N)
Client.hasMany(Site, { foreignKey: 'ClientId', as: 'Sites' });
Site.belongsTo(Client, { foreignKey: 'ClientId', as: 'Client' });

// Site <-> SiteMaterial (1:N)
Site.hasMany(SiteMaterial, { foreignKey: 'SiteId', as: 'SiteMaterials' });
SiteMaterial.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// MaterialType <-> SiteMaterial (1:N)
MaterialType.hasMany(SiteMaterial, { foreignKey: 'MaterialId', as: 'SiteMaterials' });
SiteMaterial.belongsTo(MaterialType, { foreignKey: 'MaterialId', as: 'Material' });

// Site <-> Payment (1:N)
Site.hasMany(Payment, { foreignKey: 'SiteId', as: 'Payments' });
Payment.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// Labour <-> Payment (1:N)
Labour.hasMany(Payment, { foreignKey: 'LabourId', as: 'Payments' });
Payment.belongsTo(Labour, { foreignKey: 'LabourId', as: 'Labour' });

// Material <-> Payment (1:N)
Material.hasMany(Payment, { foreignKey: 'MaterialId', as: 'Payments' });
Payment.belongsTo(Material, { foreignKey: 'MaterialId', as: 'Material' });

// Payee <-> Payment (1:N)
Payee.hasMany(Payment, { foreignKey: 'PayeeId', as: 'Payments' });
Payment.belongsTo(Payee, { foreignKey: 'PayeeId', as: 'Payee' });

// WeeklyPaySheet <-> WeeklyPaySheetItem (1:N)
WeeklyPaySheet.hasMany(WeeklyPaySheetItem, { foreignKey: 'WeeklyPaySheetId', as: 'Items' });
WeeklyPaySheetItem.belongsTo(WeeklyPaySheet, { foreignKey: 'WeeklyPaySheetId', as: 'Sheet' });

// WeeklyPaySheet <-> PettyCash (1:1)
WeeklyPaySheet.hasOne(PettyCash, { foreignKey: 'WeeklyPaySheetId', as: 'PettyCashSnapshot' });
PettyCash.belongsTo(WeeklyPaySheet, { foreignKey: 'WeeklyPaySheetId', as: 'Sheet' });

// Payee <-> WeeklyPaySheetItem (1:N)
Payee.hasMany(WeeklyPaySheetItem, { foreignKey: 'PayeeId', as: 'SheetItems' });
WeeklyPaySheetItem.belongsTo(Payee, { foreignKey: 'PayeeId', as: 'Payee' });

// Site <-> WeeklyPaySheetItem (1:N)
Site.hasMany(WeeklyPaySheetItem, { foreignKey: 'SiteId', as: 'SheetItems' });
WeeklyPaySheetItem.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// Payment <-> WeeklyPaySheetItem (1:1 optional)
Payment.hasOne(WeeklyPaySheetItem, { foreignKey: 'PaymentId', as: 'SheetItem' });
WeeklyPaySheetItem.belongsTo(Payment, { foreignKey: 'PaymentId', as: 'Payment' });

// Site <-> SiteWorkValue (1:N)
Site.hasMany(SiteWorkValue, { foreignKey: 'SiteId', as: 'WorkValues' });
SiteWorkValue.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// AttendanceSheet <-> AttendanceRecord (1:N)
AttendanceSheet.hasMany(AttendanceRecord, { foreignKey: 'AttendanceSheetId', as: 'Records' });
AttendanceRecord.belongsTo(AttendanceSheet, { foreignKey: 'AttendanceSheetId', as: 'Sheet' });

// AttendanceSheet <-> AttendanceMisc (1:N)
AttendanceSheet.hasMany(AttendanceMisc, { foreignKey: 'AttendanceSheetId', as: 'Miscs' });
AttendanceMisc.belongsTo(AttendanceSheet, { foreignKey: 'AttendanceSheetId', as: 'Sheet' });

// Payee <-> AttendanceRecord (1:N)
Payee.hasMany(AttendanceRecord, { foreignKey: 'PayeeId', as: 'AttendanceRecords' });
AttendanceRecord.belongsTo(Payee, { foreignKey: 'PayeeId', as: 'Payee' });

// Site <-> AttendanceRecord (1:N)
Site.hasMany(AttendanceRecord, { foreignKey: 'SiteId', as: 'AttendanceRecords' });
AttendanceRecord.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// Payee <-> AttendanceMisc (1:N)
Payee.hasMany(AttendanceMisc, { foreignKey: 'PayeeId', as: 'AttendanceMiscs' });
AttendanceMisc.belongsTo(Payee, { foreignKey: 'PayeeId', as: 'Payee' });

// Site <-> AttendanceMisc (1:N)
Site.hasMany(AttendanceMisc, { foreignKey: 'SiteId', as: 'AttendanceMiscs' });
AttendanceMisc.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// MaterialType <-> Material (1:N)
MaterialType.hasMany(Material, { foreignKey: 'MaterialTypeId', as: 'Materials' });
Material.belongsTo(MaterialType, { foreignKey: 'MaterialTypeId', as: 'MaterialType' });

// WeeklyPaySheet <-> ActionLog (1:N)
WeeklyPaySheet.hasMany(ActionLog, { foreignKey: 'WeeklyPaySheetId', as: 'ActionLogs' });
ActionLog.belongsTo(WeeklyPaySheet, { foreignKey: 'WeeklyPaySheetId', as: 'Sheet' });

// Site <-> SiteSection (1:N)
Site.hasMany(SiteSection, { foreignKey: 'SiteId', as: 'Sections' });
SiteSection.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// Site <-> SiteProject (1:N)
Site.hasMany(SiteProject, { foreignKey: 'SiteId', as: 'Projects' });
SiteProject.belongsTo(Site, { foreignKey: 'SiteId', as: 'Site' });

// SiteSection <-> SiteMaterial (1:N)
SiteSection.hasMany(SiteMaterial, { foreignKey: 'SectionId', as: 'SiteMaterials' });
SiteMaterial.belongsTo(SiteSection, { foreignKey: 'SectionId', as: 'Section' });

// SiteProject <-> SiteMaterial (1:N)
SiteProject.hasMany(SiteMaterial, { foreignKey: 'ProjectId', as: 'SiteMaterials' });
SiteMaterial.belongsTo(SiteProject, { foreignKey: 'ProjectId', as: 'Project' });

// SiteProject <-> WeeklyPaySheetItem (1:N)
SiteProject.hasMany(WeeklyPaySheetItem, { foreignKey: 'ProjectId', as: 'SheetItems' });
WeeklyPaySheetItem.belongsTo(SiteProject, { foreignKey: 'ProjectId', as: 'Project' });

module.exports = {
    sequelize,
    User,
    Client,
    Site,
    Labour,
    Material,
    SiteMaterial,
    Payment,
    Payee,
    WeeklyPaySheet,
    WeeklyPaySheetItem,
    SiteWorkValue,
    ShiftMaster,
    AttendanceSheet,
    AttendanceRecord,
    AttendanceMisc,
    PersonType,
    MaterialType,
    PettyCash,
    PersonalExpense,
    ActionLog,
    SiteSection,
    SiteProject
};
