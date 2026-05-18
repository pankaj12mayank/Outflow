/**
 * Public hooks barrel — keep exports explicit to avoid circular deps / webpack chunk errors.
 */
export { useAuth, AuthProvider, addPermissionsToUser, getPermissionsForRole, type User } from "./useAuth";
export { useSystemOwnerAuth, SystemOwnerAuthProvider } from "./useSystemOwnerAuth";
export { useCampaigns, useCampaign } from "./useCampaigns";
export {
  useAdminOrgs,
  useAdminOrg,
  useSuspendOrg,
  useReactivateOrg,
  usePlatformStats,
  useBillingStats,
  useMonitoringStats,
  useAbuseReports,
  useResolveAbuseReport,
  usePlans,
  useCreatePlan,
  useUpdatePlan,
  useAdminLimits,
  useUpdateLimits,
  useFeatureFlags,
  useUpdateFeatureFlag,
  useGlobalSettings,
  useUpdateGlobalSetting,
  useSystemAlerts,
  useAdminLogs,
} from "./use-admin";
