import Config from "./config";
import { Database } from "./db";
import Logger from "./logger";

const logger = Logger.get();

function expandCommaSeparatedEntries(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function readNameFilterList(key: string): string[] {
  return expandCommaSeparatedEntries(Config.readList(key));
}

function compileRegexFilters(filters: string[], filterName: string): RegExp[] {
  const regexes: RegExp[] = [];
  for (const filter of filters) {
    try {
      regexes.push(new RegExp(filter));
    } catch {
      logger.warn(
        `Ungueltiges Regex in ${filterName}: "${filter}" - Filter wird ignoriert.`,
      );
    }
  }
  return regexes;
}

function matchesAnyRegex(value: string, regexes: RegExp[]): boolean {
  return regexes.some((regex) => regex.test(value));
}

interface UserRow {
  id: number;
  username: string;
  display_name: string;
  locked: number | null;
}

interface GroupRow {
  id: number;
  name: string;
}

interface MembershipRow {
  benutzer_id: number;
  gruppen_id: number;
}

interface EnaioGroup {
  id: number;
  name: string;
  users: Set<EnaioUser>;
}

interface EnaioUser {
  id: number;
  username: string;
  display_name: string;
  groups: Set<EnaioGroup>;
}

export interface UsersAndGroups {
  users: Set<EnaioUser>;
  groups: Set<EnaioGroup>;
}

export default class EnaioQuery {
  public static async getUsersAndGroups(): Promise<UsersAndGroups> {
    const [users, groups, memberships] = await Promise.all([
      Database.query<UserRow>(
        "SELECT id, benutzer as username, name as display_name, locked FROM sysadm.benutzer",
      ),
      Database.query<GroupRow>("SELECT id, name FROM sysadm.gruppen"),
      Database.query<MembershipRow>(
        "SELECT benutzer_id, gruppen_id FROM sysadm.bgrel",
      ),
    ]);

    logger.info(
      `Aus der Datenbank geladen: ${users.recordset.length} Benutzer und ${groups.recordset.length} Gruppen.`,
    );

    const filterGroupNameAllowlist = new Set(
      readNameFilterList("FILTER_GROUP_ALLOWLIST"),
    );
    const filterGroupNameBlocklist = new Set(
      readNameFilterList("FILTER_GROUP_BLOCKLIST"),
    );
    const filterGroupsNotMatchingRegex = compileRegexFilters(
      Config.readList("FILTER_GROUPS_NOT_MATCHING_REGEX"),
      "FILTER_GROUPS_NOT_MATCHING_REGEX",
    );
    const filterGroupsWithMatchingRegex = compileRegexFilters(
      Config.readList("FILTER_GROUPS_WITH_MATCHING_REGEX"),
      "FILTER_GROUPS_WITH_MATCHING_REGEX",
    );

    const groupsAllMap: Map<number, EnaioGroup> = new Map();
    for (const group of groups.recordset) {
      if (
        typeof group.id === "number" &&
        typeof group.name === "string" &&
        group.name.trim().length > 0
      ) {
        groupsAllMap.set(group.id, {
          id: group.id,
          name: group.name,
          users: new Set(),
        });
      }
    }

    const totalGroupsCount = groupsAllMap.size;
    const groupsFilteredMap: Map<number, EnaioGroup> = new Map();
    for (const [groupId, group] of groupsAllMap) {
      const isAllowlistedGroup = filterGroupNameAllowlist.has(group.name);
      if (isAllowlistedGroup) {
        groupsFilteredMap.set(groupId, {
          id: group.id,
          name: group.name,
          users: new Set(),
        });
        continue;
      }

      if (filterGroupNameBlocklist.has(group.name)) {
        continue;
      }
      if (
        filterGroupsNotMatchingRegex.length > 0 &&
        !matchesAnyRegex(group.name, filterGroupsNotMatchingRegex)
      ) {
        continue;
      }
      if (
        filterGroupsWithMatchingRegex.length > 0 &&
        !matchesAnyRegex(group.name, filterGroupsWithMatchingRegex)
      ) {
        continue;
      }

      groupsFilteredMap.set(groupId, {
        id: group.id,
        name: group.name,
        users: new Set(),
      });
    }

    const membershipsByUser: Map<number, Set<EnaioGroup>> = new Map();
    for (const membership of memberships.recordset) {
      const group = groupsAllMap.get(membership.gruppen_id);
      if (!group) {
        continue;
      }

      const userGroups = membershipsByUser.get(membership.benutzer_id);
      if (userGroups) {
        userGroups.add(group);
      } else {
        membershipsByUser.set(membership.benutzer_id, new Set([group]));
      }
    }

    const filterLocked = Config.readBoolean("FILTER_USERS_IGNORE_LOCKED", false);
    const filterUsersGroupAllowlist = new Set(
      readNameFilterList("FILTER_USERS_WITH_GROUP_ALLOWLIST"),
    );
    const filterUsersGroupBlocklist = new Set(
      readNameFilterList("FILTER_USERS_WITH_GROUP_BLOCKLIST"),
    );
    const filterUsersWithGroupsNotMatchingRegex = compileRegexFilters(
      Config.readList("FILTER_USERS_WITH_GROUPS_NOT_MATCHING_REGEX"),
      "FILTER_USERS_WITH_GROUPS_NOT_MATCHING_REGEX",
    );
    const filterUsersWithMatchingRegex = compileRegexFilters(
      Config.readList("FILTER_USERS_WITH_USERNAME_MATCHING_REGEX"),
      "FILTER_USERS_WITH_USERNAME_MATCHING_REGEX",
    );
    const filterUsersWithNotMatchingRegex = compileRegexFilters(
      Config.readList("FILTER_USERS_WITH_USERNAME_NOT_MATCHING_REGEX"),
      "FILTER_USERS_WITH_USERNAME_NOT_MATCHING_REGEX",
    );
    const filterUsersAllowlist = new Set(
      readNameFilterList("FILTER_USERS_ALLOWLIST"),
    );
    const filterUsersBlocklist = new Set(
      readNameFilterList("FILTER_USERS_BLOCKLIST"),
    );

    const userMap: Map<number, EnaioUser> = new Map();
    let filteredUserCount = 0;

    for (const user of users.recordset) {
      if (
        typeof user.id !== "number" ||
        typeof user.username !== "string" ||
        user.username.trim().length === 0 ||
        typeof user.display_name !== "string" ||
        user.display_name.trim().length === 0
      ) {
        continue;
      }

      const isAllowlistedUser = filterUsersAllowlist.has(user.username);
      const userGroupsAll = membershipsByUser.get(user.id) ?? new Set<EnaioGroup>();
      const userGroupNames = Array.from(userGroupsAll, (group) => group.name);
      const isInAllowlistedGroup = userGroupNames.some((groupName) =>
        filterGroupNameAllowlist.has(groupName),
      );
      const isUserForceIncluded = isAllowlistedUser || isInAllowlistedGroup;

      if (!isUserForceIncluded) {
        if (filterUsersBlocklist.has(user.username)) {
          filteredUserCount++;
          continue;
        }
        if (
          filterUsersWithMatchingRegex.length > 0 &&
          !matchesAnyRegex(user.username, filterUsersWithMatchingRegex)
        ) {
          filteredUserCount++;
          continue;
        }
        if (
          filterUsersWithNotMatchingRegex.length > 0 &&
          matchesAnyRegex(user.username, filterUsersWithNotMatchingRegex)
        ) {
          filteredUserCount++;
          continue;
        }
        if (filterLocked && user.locked === 1) {
          filteredUserCount++;
          continue;
        }
        if (filterUsersGroupAllowlist.size > 0) {
          const hasAllowedGroup = userGroupNames.some((groupName) =>
            filterUsersGroupAllowlist.has(groupName),
          );
          if (!hasAllowedGroup) {
            filteredUserCount++;
            continue;
          }
        }
        if (filterUsersGroupBlocklist.size > 0) {
          const hasBlockedGroup = userGroupNames.some((groupName) =>
            filterUsersGroupBlocklist.has(groupName),
          );
          if (hasBlockedGroup) {
            filteredUserCount++;
            continue;
          }
        }
        if (filterUsersWithGroupsNotMatchingRegex.length > 0) {
          const hasGroupWithoutRegexMatch = userGroupNames.some(
            (groupName) =>
              !matchesAnyRegex(groupName, filterUsersWithGroupsNotMatchingRegex),
          );
          if (!hasGroupWithoutRegexMatch) {
            filteredUserCount++;
            continue;
          }
        }
      }

      const userGroupsFiltered: Set<EnaioGroup> = new Set();
      for (const group of userGroupsAll) {
        const filteredGroup = groupsFilteredMap.get(group.id);
        if (filteredGroup) {
          userGroupsFiltered.add(filteredGroup);
        }
      }

      const userObj: EnaioUser = {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        groups: userGroupsFiltered,
      };

      for (const group of userGroupsFiltered) {
        group.users.add(userObj);
      }

      userMap.set(user.id, userObj);
    }

    logger.info(
      `Aufgrund der Konfiguration ausgeschlossen: ${filteredUserCount} Benutzer.`,
    );

    const filterGroupsMinUsers = Config.readNumber("FILTER_GROUPS_MIN_USERS", 0);
    if (filterGroupsMinUsers > 0) {
      for (const [groupId, group] of groupsFilteredMap) {
        if (filterGroupNameAllowlist.has(group.name)) {
          continue;
        }
        if (group.users.size < filterGroupsMinUsers) {
          groupsFilteredMap.delete(groupId);
          for (const user of group.users) {
            user.groups.delete(group);
          }
        }
      }
    }

    const filteredGroupsCount = totalGroupsCount - groupsFilteredMap.size;
    logger.info(
      `Aufgrund der Konfiguration ausgeschlossen: ${filteredGroupsCount} Gruppen.`,
    );

    const finalUsers = new Set(userMap.values());
    const finalGroups = new Set(groupsFilteredMap.values());
    logger.info(
      `Endausgabe enthaelt ${finalUsers.size} Benutzer und ${finalGroups.size} Gruppen.`,
    );

    return {
      users: finalUsers,
      groups: finalGroups,
    };
  }
}
