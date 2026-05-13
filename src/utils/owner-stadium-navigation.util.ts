export type OwnerStadiumRouteTarget =
  | string
  | {
      pathname: string;
      params?: Record<string, string>;
    };

export const OWNER_HOME_HREF = "/(owners)/home";
export const OWNER_CLUSTER_LIST_HREF = "/(owners)/(stadium)/clusterList";

const toPositiveId = (value?: number | string | null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const ownerClusterDetailTarget = (
  clusterId?: number | string | null
): OwnerStadiumRouteTarget => {
  const id = toPositiveId(clusterId);
  if (!id) return OWNER_CLUSTER_LIST_HREF;

  return {
    pathname: "/(owners)/(stadium)/clusterDetail",
    params: { id: String(id) },
  };
};

export const ownerStadiumManagementTarget = (
  clusterId?: number | string | null
): OwnerStadiumRouteTarget => {
  const id = toPositiveId(clusterId);
  if (!id) return OWNER_CLUSTER_LIST_HREF;

  return {
    pathname: "/(owners)/(stadium)/stadiumManagement",
    params: { clusterId: String(id) },
  };
};

export const ownerAddFieldTarget = (
  clusterId?: number | string | null
): OwnerStadiumRouteTarget => {
  const id = toPositiveId(clusterId);
  if (!id) return OWNER_CLUSTER_LIST_HREF;

  return {
    pathname: "/(owners)/(stadium)/addField",
    params: { clusterId: String(id) },
  };
};

export const resolveOwnerClusterListBackTarget = () => OWNER_HOME_HREF;

export const resolveOwnerClusterCreateBackTarget = () => OWNER_CLUSTER_LIST_HREF;

export const resolveOwnerClusterDetailBackTarget = () => OWNER_CLUSTER_LIST_HREF;

export const resolveOwnerStadiumManagementBackTarget = (
  clusterId?: number | string | null
) => ownerClusterDetailTarget(clusterId);

export const resolveOwnerAddFieldBackTarget = (clusterId?: number | string | null) =>
  ownerStadiumManagementTarget(clusterId);
