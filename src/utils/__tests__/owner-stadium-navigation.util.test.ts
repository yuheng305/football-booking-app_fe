import {
  OWNER_CLUSTER_LIST_HREF,
  OWNER_HOME_HREF,
  ownerAddFieldTarget,
  ownerClusterDetailTarget,
  ownerStadiumManagementTarget,
  resolveOwnerAddFieldBackTarget,
  resolveOwnerClusterCreateBackTarget,
  resolveOwnerClusterDetailBackTarget,
  resolveOwnerClusterListBackTarget,
  resolveOwnerStadiumManagementBackTarget,
} from "@/src/utils/owner-stadium-navigation.util";

describe("owner stadium navigation", () => {
  it("cluster list back returns owner home", () => {
    expect(resolveOwnerClusterListBackTarget()).toBe(OWNER_HOME_HREF);
  });

  it("create cluster back always returns cluster list", () => {
    expect(resolveOwnerClusterCreateBackTarget()).toBe(OWNER_CLUSTER_LIST_HREF);
  });

  it("cluster detail back always returns cluster list", () => {
    expect(resolveOwnerClusterDetailBackTarget()).toBe(OWNER_CLUSTER_LIST_HREF);
  });

  it("stadium management back returns the parent cluster detail when cluster id exists", () => {
    expect(resolveOwnerStadiumManagementBackTarget(12)).toEqual({
      pathname: "/(owners)/(stadium)/clusterDetail",
      params: { id: "12" },
    });
  });

  it("stadium management back falls back to cluster list without a valid cluster id", () => {
    expect(resolveOwnerStadiumManagementBackTarget(null)).toBe(OWNER_CLUSTER_LIST_HREF);
    expect(resolveOwnerStadiumManagementBackTarget("0")).toBe(OWNER_CLUSTER_LIST_HREF);
  });

  it("add field back returns the stadium management screen for the same cluster", () => {
    expect(resolveOwnerAddFieldBackTarget("9")).toEqual({
      pathname: "/(owners)/(stadium)/stadiumManagement",
      params: { clusterId: "9" },
    });
  });

  it("route builders reject invalid ids instead of generating broken routes", () => {
    expect(ownerClusterDetailTarget("abc")).toBe(OWNER_CLUSTER_LIST_HREF);
    expect(ownerStadiumManagementTarget(undefined)).toBe(OWNER_CLUSTER_LIST_HREF);
    expect(ownerAddFieldTarget(-1)).toBe(OWNER_CLUSTER_LIST_HREF);
  });
});
