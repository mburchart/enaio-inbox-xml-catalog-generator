import Config from "./config";
import { UsersAndGroups } from "./queries";
import fs from "node:fs";
import path from "node:path";
import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import Logger from "./logger";

const logger = Logger.get();

function expandCommaSeparatedEntries(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default class XMLBuilder {
  private static formatXml(xmlString: string): string {
    const withNewlines = xmlString.replace(/></g, ">\n<");
    const lines = withNewlines.split("\n");
    let indentLevel = 0;
    const indent = "  ";
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("</")) {
        indentLevel = Math.max(indentLevel - 1, 0);
      }
      const result = `${indent.repeat(indentLevel)}${trimmed}`;
      if (
        trimmed.startsWith("<") &&
        !trimmed.startsWith("</") &&
        !trimmed.endsWith("/>") &&
        !trimmed.startsWith("<?") &&
        !trimmed.startsWith("<!")
      ) {
        indentLevel += 1;
      }
      return result;
    });
    return formatted.join("\n");
  }

  public static async buildPostalXML(
    usersAndGroups: UsersAndGroups,
  ): Promise<void> {
    const pathXMLUsers = path.resolve(
      Config.readString("POSTAL_PATH_XML_USERS", "./users.xml"),
    );
    const pathXMLGroups = path.resolve(
      Config.readString("POSTAL_PATH_XML_GROUPS", "./groups.xml"),
    );
    const parser = new DOMParser();
    const domXmlUsers = parser.parseFromString(
      "<axaddxmltree></axaddxmltree>",
      "text/xml",
    );
    const rootXmlUsers = domXmlUsers.documentElement;
    const domXmlGroups = parser.parseFromString(
      "<axaddxmltree></axaddxmltree>",
      "text/xml",
    );
    const rootXmlGroups = domXmlGroups.documentElement;

    const applyTemplateRootAttributes = (
      templatePath: string,
      root: Element,
      label: string,
    ) => {
      if (!fs.existsSync(templatePath)) return;
      const prevXml = fs.readFileSync(templatePath, "utf8");
      const prevDom = parser.parseFromString(prevXml, "text/xml");
      const templateAttributes = prevDom.documentElement.attributes;
      for (let i = 0; i < templateAttributes.length; i++) {
        const attr = templateAttributes.item(i);
        if (attr) {
          root.setAttribute(attr.name, attr.value);
        }
      }
      logger.info(`XML-Template fuer ${label} aus ${templatePath} geladen.`);
    };
    applyTemplateRootAttributes(pathXMLUsers, rootXmlUsers, "users");
    applyTemplateRootAttributes(pathXMLGroups, rootXmlGroups, "groups");

    const xmlSortableEnabled = Config.readBoolean("XML_SORTABLE", true);
    const xmlSortableValue = xmlSortableEnabled ? "-1" : "0";
    rootXmlUsers.setAttribute("sortable", xmlSortableValue);

    const defaultGroupRootAttributes: Record<string, string> = {
      returnsinglevalue: "1",
      multiselect: "0",
      showreturnvalue: "1",
      withcheck: "1",
      initaslist: "0",
      selectlastnode: "0",
      deselectwhencollapse: "0",
      splitchar: "|",
      group_splitchar: ";",
      gridlines: "0",
      validate: "0",
      stayopenonerror: "0",
      allow_oneclick: "1",
      initasdialog: "0",
      autosort: "1",
      checkgroup: "0",
      checkfieldvalue: "0",
      checkfieldinputvalue: "0",
      checkfieldguid: "",
      checkfieldname: "",
      checkfieldinternalname: "",
      checkinputvalue: "0",
      checkdynamicinputvalue: "0",
      initializeasdatabankcatalog: "0",
      showdatabankcolums: "0",
      treealignment: "0",
      columnright: "0",
      fontname: "MS Sans Serif",
      fontsize: "-1",
      checkicons: "0",
      showgrouplist: "0",
      showusergroups: "0",
      showgroupinfo: "0",
      showuserlist: "0",
      showuserinfo: "0",
      addgroupuserarea: "0",
      addgroupidentifier: "0",
      adduseridentifier: "0",
      showuseringroup: "0",
      mandant: "0",
    };
    for (const [key, value] of Object.entries(defaultGroupRootAttributes)) {
      if (!rootXmlGroups.hasAttribute(key)) {
        rootXmlGroups.setAttribute(key, value);
      }
    }

    // Build groups XML
    const groupKeywordFirst = expandCommaSeparatedEntries(
      Config.readList("GROUP_SORT_KEYWORDS_FIRST"),
    );
    const groupSortOrderRaw = Config.readString(
      "GROUP_SORT_ORDER",
      "",
    ).toLowerCase();
    const groupSortNumericRaw = Config.readString(
      "GROUP_SORT_NUMERIC",
      "",
    ).toLowerCase();
    const groupSortEnabled =
      groupKeywordFirst.length > 0 ||
      groupSortOrderRaw !== "" ||
      groupSortNumericRaw !== "";
    const groupSortOrder = groupSortOrderRaw === "" ? "asc" : groupSortOrderRaw;
    const groupSortNumeric =
      groupSortNumericRaw === ""
        ? true
        : ["1", "true", "yes", "y", "on"].includes(groupSortNumericRaw);
    const suffixKeywordMatchers = groupKeywordFirst.map((keyword, index) => ({
      index,
      regex: new RegExp(`(?:_|-)${escapeRegex(keyword)}$`, "i"),
      keywordLower: keyword.toLowerCase(),
    }));
    const getGroupSortMeta = (groupName: string) => {
      const exactKeywordIndex = suffixKeywordMatchers.findIndex(
        (matcher) => matcher.keywordLower === groupName.toLowerCase(),
      );
      let suffixKeywordIndex = Number.POSITIVE_INFINITY;
      let baseName = groupName;
      for (const matcher of suffixKeywordMatchers) {
        if (matcher.regex.test(groupName)) {
          suffixKeywordIndex = matcher.index;
          baseName = groupName.replace(matcher.regex, "");
          break;
        }
      }
      return {
        exactKeywordIndex:
          exactKeywordIndex >= 0 ? exactKeywordIndex : Number.POSITIVE_INFINITY,
        suffixKeywordIndex,
        baseName,
      };
    };
    const groupComparator = (
      left: { name: string },
      right: { name: string },
    ) => {
      const leftName = left.name;
      const rightName = right.name;
      const leftMeta = getGroupSortMeta(leftName);
      const rightMeta = getGroupSortMeta(rightName);

      if (leftMeta.exactKeywordIndex !== rightMeta.exactKeywordIndex) {
        return leftMeta.exactKeywordIndex - rightMeta.exactKeywordIndex;
      }

      const baseCompare = leftMeta.baseName.localeCompare(rightMeta.baseName, "de-DE", {
        numeric: groupSortNumeric,
        sensitivity: "base",
      });
      if (baseCompare !== 0) {
        return groupSortOrder === "desc" ? -baseCompare : baseCompare;
      }

      if (leftMeta.suffixKeywordIndex !== rightMeta.suffixKeywordIndex) {
        return leftMeta.suffixKeywordIndex - rightMeta.suffixKeywordIndex;
      }

      return groupSortOrder === "desc"
        ? -leftName.localeCompare(rightName, "de-DE", {
            numeric: groupSortNumeric,
            sensitivity: "base",
          })
        : leftName.localeCompare(rightName, "de-DE", {
            numeric: groupSortNumeric,
            sensitivity: "base",
          });
    };

    const returnValueGroupSuffix = Config.readString("RETURNVALUE_GROUP_SUFFIX", "(g)");
    const returnValueUserSuffix = Config.readString("RETURNVALUE_USER_SUFFIX", "");
    const sortedGroups = groupSortEnabled
      ? Array.from(usersAndGroups.groups).sort(groupComparator)
      : Array.from(usersAndGroups.groups);
    const groupsSortableValue = "-1";

    for (const group of sortedGroups) {
      const groupName = group.name.trim();
      if (!groupName) continue;
      const groupEbene = XMLBuilder.createEbene(domXmlGroups, {
        name: groupName,
        returnValue: `${groupName}${returnValueGroupSuffix}`,
        selectable: "1",
        autoexpand: "1",
        sortableValue: groupsSortableValue,
        forceNonSelfClosing: true,
      });
      rootXmlGroups.appendChild(groupEbene);
    }

    // Build users XML
    const userKeywordFirst = Config.readList("USER_SORT_KEYWORDS_FIRST");
    const userSortOrderRaw = Config.readString("USER_SORT_ORDER", "").toLowerCase();
    const userSortByRaw = Config.readString("USER_SORT_BY", "").toLowerCase();
    const userSortEnabled =
      userKeywordFirst.length > 0 ||
      userSortOrderRaw !== "" ||
      userSortByRaw !== "";
    const userSortOrder = userSortOrderRaw === "" ? "asc" : userSortOrderRaw;
    const userSortBy = userSortByRaw === "" ? "last_name" : userSortByRaw;
    const userComparator = (
      a: { display_name: string },
      b: { display_name: string },
    ) => {
      const leftName = a.display_name;
      const rightName = b.display_name;
      const leftHasKeyword = userKeywordFirst.some((kw) =>
        leftName.toLowerCase().includes(kw.toLowerCase()),
      );
      const rightHasKeyword = userKeywordFirst.some((kw) =>
        rightName.toLowerCase().includes(kw.toLowerCase()),
      );
      if (leftHasKeyword !== rightHasKeyword) {
        return leftHasKeyword ? -1 : 1;
      }
      const leftKey =
        userSortBy === "last_name"
          ? (leftName.trim().split(/\s+/).slice(-1)[0] ?? "")
          : leftName;
      const rightKey =
        userSortBy === "last_name"
          ? (rightName.trim().split(/\s+/).slice(-1)[0] ?? "")
          : rightName;
      const keyCompare = leftKey.localeCompare(rightKey, "de-DE", {
        sensitivity: "base",
      });
      if (keyCompare !== 0) {
        return userSortOrder === "desc" ? -keyCompare : keyCompare;
      }
      const nameCompare = leftName.localeCompare(rightName, "de-DE", {
        sensitivity: "base",
      });
      return userSortOrder === "desc" ? -nameCompare : nameCompare;
    };

    for (const group of sortedGroups) {
      const groupName = group.name.trim();
      if (!groupName) continue;
      const groupEbene = XMLBuilder.createEbene(domXmlUsers, {
        name: groupName,
        returnValue: `${groupName}${returnValueGroupSuffix}`,
        selectable: "0",
        includeRestriction: true,
        autoexpand: "1",
        sortableValue: xmlSortableValue,
      });
      const sortedUsers = userSortEnabled
        ? Array.from(group.users).sort(userComparator)
        : Array.from(group.users);
      for (const user of sortedUsers) {
        const userEbene = XMLBuilder.createEbene(domXmlUsers, {
          name: user.display_name,
          returnValue: `${user.username}${returnValueUserSuffix}`,
          selectable: "1",
          autoexpand: "0",
          sortableValue: xmlSortableValue,
          forceNonSelfClosing: true,
        });
        groupEbene.appendChild(userEbene);
      }
      rootXmlUsers.appendChild(groupEbene);
    }

    // Write both XML files
    const xmlSerializer = new XMLSerializer();
    const finalXmlUsers = XMLBuilder.formatXml(
      xmlSerializer.serializeToString(domXmlUsers),
    );
    fs.writeFileSync(pathXMLUsers, finalXmlUsers, "utf8");
    logger.info(`Benutzer-XML gespeichert unter ${pathXMLUsers}`);
    const compactXmlGroups = xmlSerializer.serializeToString(domXmlGroups);
    fs.writeFileSync(pathXMLGroups, compactXmlGroups, "utf8");
    logger.info(`Gruppen-XML gespeichert unter ${pathXMLGroups}`);
  }

  private static createCData(
    document: Document,
    checkValue: string,
  ): CDATASection {
    const safeValue = checkValue.replace(/\]\]>/g, "]]]]><![CDATA[>");
    const restriction = `<Restriction><CheckValues><CheckValue>${safeValue}</CheckValue></CheckValues></Restriction>`;
    return document.createCDATASection(restriction);
  }

  private static createEbene(
    document: Document,
    options: {
      returnValue: string;
      name: string;
      selectable: "0" | "1";
      includeRestriction?: boolean;
      autoexpand?: "0" | "1";
      sortableValue?: string;
      forceNonSelfClosing?: boolean;
    },
  ): Element {
    const ebene = document.createElement("ebene");
    ebene.setAttribute("selectable", options.selectable);
    ebene.setAttribute("returnvalue", options.returnValue);
    ebene.setAttribute("bold", "0");
    ebene.setAttribute("autoexpand", options.autoexpand ?? "0");
    ebene.setAttribute("forecolor", "0");
    ebene.setAttribute("spezialicon", "");
    ebene.setAttribute("iscolumnvalue", "0");
    ebene.setAttribute("sortable", options.sortableValue ?? "-1");
    ebene.setAttribute("name", options.name);
    if (options.includeRestriction) {
      const cdata = XMLBuilder.createCData(document, options.returnValue);
      ebene.appendChild(cdata);
    }
    if (options.forceNonSelfClosing && ebene.childNodes.length === 0) {
      ebene.appendChild(document.createTextNode(""));
    }
    return ebene;
  }
}
