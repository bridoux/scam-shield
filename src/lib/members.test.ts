import { describe, expect, it } from "vitest";
import { permissionsFor, type Role } from "./members";

const person = (userId: string, role: Role, active = true) => ({ userId, role, active });
const owner = person("o", "owner");
const admin = person("a", "admin");
const player = person("p", "player");

describe("permissionsFor", () => {
  it("lets the owner do everything to an active admin", () => {
    expect(permissionsFor(owner, admin)).toEqual({ canMove: true, canChangeRole: true, canMakeOwner: true, canChangeAccess: true });
  });

  it("lets the owner manage a player but not make them owner directly", () => {
    expect(permissionsFor(owner, player)).toEqual({ canMove: true, canChangeRole: true, canMakeOwner: false, canChangeAccess: true });
  });

  it("lets admins move and remove players, without changing roles", () => {
    expect(permissionsFor(admin, player)).toEqual({ canMove: true, canChangeRole: false, canMakeOwner: false, canChangeAccess: true });
  });

  it("stops admins from touching other admins or the owner", () => {
    const none = { canMove: false, canChangeRole: false, canMakeOwner: false, canChangeAccess: false };
    expect(permissionsFor(admin, person("a2", "admin"))).toEqual(none);
    expect(permissionsFor(admin, owner)).toEqual(none);
  });

  it("lets owners and admins change only their own team", () => {
    expect(permissionsFor(owner, owner)).toEqual({ canMove: true, canChangeRole: false, canMakeOwner: false, canChangeAccess: false });
    expect(permissionsFor(admin, admin)).toEqual({ canMove: true, canChangeRole: false, canMakeOwner: false, canChangeAccess: false });
  });

  it("gives players no controls, even over themselves", () => {
    expect(Object.values(permissionsFor(player, player)).some(Boolean)).toBe(false);
    expect(Object.values(permissionsFor(player, person("p2", "player"))).some(Boolean)).toBe(false);
  });

  it("allows only restoring access for a former member", () => {
    expect(permissionsFor(admin, person("p2", "player", false))).toEqual({ canMove: false, canChangeRole: false, canMakeOwner: false, canChangeAccess: true });
  });
});
