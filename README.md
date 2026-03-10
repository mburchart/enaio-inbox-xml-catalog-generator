# enaio® Postverteilung: XML-Kataloge (Organisationseinheit & Sachbearbeitung)

## Disclaimer / Markenhinweis

enaio® ist eine Marke der **OPTIMAL SYSTEMS GmbH**. Das Projekt steht in keiner offiziellen Verbindung zur OPTIMAL SYSTEMS GmbH und wird nicht von ihr unterstuetzt oder verantwortet.

Dieses Projekt erzeugt XML-Dateien im **axaddxmltree**-Format (Ebenen-Baum) fuer enaio®. Die Daten stammen aus der enaio®-Datenbank (Benutzer, Gruppen, Mitgliedschaften) und werden optional gefiltert und sortiert.

## Zweck und Output

Das Projekt erzeugt zwei XML-Dateien, deren Pfade per `.env` konfiguriert werden:

- `POSTAL_PATH_XML_GROUPS` (Baum aus Gruppen)
- `POSTAL_PATH_XML_USERS` (Baum aus Gruppen → Benutzer)

Standardmaessig entstehen `./groups.xml` und `./users.xml`. Typische enaio®-Namen wie `posteingang-organisationseinheit.xml` bzw. `posteingang-sachbearbeitung.xml` muessen in der Konfiguration gesetzt werden.

Die Daten kommen aus den Tabellen `sysadm.benutzer`, `sysadm.gruppen` und `sysadm.bgrel`.

## Datenfluss

1. Verbindung zur enaio®-Datenbank herstellen.
2. Benutzer, Gruppen und Zuordnungen laden.
3. Filter anwenden (optional).
4. Sortierung anwenden (optional).
5. `posteingang-sachbearbeitung.xml` und `posteingang-organisationseinheit.xml` schreiben.

## Requirements

- Node.js (LTS empfohlen)
- Zugriff auf die enaio®-Datenbank (MSSQL)

## Setup

1. Abhaengigkeiten installieren: `npm install`
2. `.env` anhand von `env.example` anlegen und befuellen.
3. Build erzeugen: `npm run build`
4. Ausfuehren: `npm run serve` (enthaelt `tsc` + Start)

## Konfiguration

Alle Variablen werden aus `.env` gelesen. Leere Werte gelten als „nicht gesetzt“. Boolean-Werte akzeptieren `1/true/yes/y/on` (sonst `false`).

| Variable                                        | Typ     | Beschreibung                                                                     | Standard/Verhalten         |
| ----------------------------------------------- | ------- | -------------------------------------------------------------------------------- | -------------------------- |
| `DB_USER`                                       | string  | Datenbank-Benutzer                                                               | `user`                     |
| `DB_PASSWORD`                                   | string  | Datenbank-Passwort                                                               | `password`                 |
| `DB_SERVER`                                     | string  | MSSQL-Server, inkl. Instance moeglich                                             | `localhost`                |
| `DB_DATABASE`                                   | string  | Datenbankname                                                                    | `osecm`                    |
| `DB_PORT`                                       | number  | Datenbank-Port                                                                   | `1433`                     |
| `DB_ENCRYPT`                                    | boolean | TLS/Encryption aktivieren                                                        | `false`                    |
| `DB_TRUST_SERVER_CERT`                          | boolean | Self-signed Zertifikate erlauben                                                 | `false`                    |
| `DB_REQUEST_TIMEOUT`                            | number  | Request-Timeout in ms                                                            | `60000`                    |
| `DB_CONNECTION_TIMEOUT`                         | number  | Connection-Timeout in ms                                                         | `15000`                    |
| `LOG_LEVEL`                                     | string  | Logging-Level                                                                    | `info`                     |
| `POSTAL_PATH_XML_USERS`                         | string  | Zielpfad fuer das Benutzer-XML                                                   | `./users.xml`              |
| `POSTAL_PATH_XML_GROUPS`                        | string  | Zielpfad fuer das Gruppen-XML                                                    | `./groups.xml`             |
| `XML_SORTABLE`                                  | boolean | Setzt `sortable` im Benutzer-XML auf Root/ebene                                  | `true`                     |
| `GROUP_SORT_KEYWORDS_FIRST`                     | list    | Prioritaets-Schluesselwoerter fuer Gruppen: exakter Name zuerst, dann Suffix (z.B. `_LEITUNG`) | leer = keine Keywords |
| `GROUP_SORT_ORDER`                              | string  | Sortierreihenfolge `asc` oder `desc`                                             | leer = `asc`               |
| `GROUP_SORT_NUMERIC`                            | boolean | Numerische Sortierung                                                            | leer = `true`              |
| `USER_SORT_KEYWORDS_FIRST`                      | list    | Schluesselwoerter in `display_name`, die priorisiert werden                       | leer = keine Keywords      |
| `USER_SORT_ORDER`                               | string  | Sortierreihenfolge `asc` oder `desc`                                             | leer = `asc`               |
| `USER_SORT_BY`                                  | string  | Sortierfeld `last_name` oder alles andere = kompletter `display_name`            | leer = `last_name`         |
| `FILTER_GROUP_ALLOWLIST`                        | list    | Gruppen immer einschliessen (force include), auch wenn andere Gruppenfilter nicht matchen | leer = deaktiviert |
| `FILTER_GROUP_BLOCKLIST`                        | list    | Diese Gruppen ausschliessen (exakte Namen)                                       | leer = keine Einschraenkung |
| `FILTER_GROUPS_WITH_MATCHING_REGEX`             | list    | Gruppe bleibt nur, wenn mindestens ein Regex matcht                              | leer = deaktiviert         |
| `FILTER_GROUPS_NOT_MATCHING_REGEX`              | list    | Gruppe bleibt nur, wenn mindestens ein Regex matcht (aktuelles Verhalten)        | leer = deaktiviert         |
| `FILTER_GROUPS_MIN_USERS`                       | number  | Gruppen mit weniger Mitgliedern entfernen                                        | `0`                        |
| `FILTER_USERS_IGNORE_LOCKED`                    | boolean | Gesperrte Benutzer ignorieren                                                    | `false`                    |
| `FILTER_USERS_ALLOWLIST`                        | list    | Benutzer immer einschliessen (force include), auch wenn andere Benutzerfilter nicht matchen | leer = deaktiviert |
| `FILTER_USERS_BLOCKLIST`                        | list    | Diese Benutzer ausschliessen                                                     | leer = keine Einschraenkung |
| `FILTER_USERS_WITH_GROUP_ALLOWLIST`             | list    | Benutzer muessen Mitglied in mindestens einer dieser Gruppen sein                | leer = deaktiviert         |
| `FILTER_USERS_WITH_GROUP_BLOCKLIST`             | list    | Benutzer werden ausgeschlossen, wenn sie in einer dieser Gruppen sind            | leer = deaktiviert         |
| `FILTER_USERS_WITH_USERNAME_MATCHING_REGEX`     | list    | Nur Benutzer mit Regex-Match                                                     | leer = deaktiviert         |
| `FILTER_USERS_WITH_USERNAME_NOT_MATCHING_REGEX` | list    | Benutzer mit Regex-Match ausschliessen                                           | leer = deaktiviert         |
| `FILTER_USERS_WITH_GROUPS_NOT_MATCHING_REGEX`   | list    | Benutzer bleibt nur, wenn er mindestens eine Gruppe hat, die keinen Regex matcht | leer = deaktiviert         |
| `RETURNVALUE_GROUP_SUFFIX`                      | string  | Suffix fuer `returnvalue` der Gruppen-Ebenen im Benutzer-XML (inkl. Restriction-CheckValue) | leer in `.env` = `(g)` im Skript |
| `RETURNVALUE_USER_SUFFIX`                       | string  | Suffix fuer `returnvalue` der Benutzer-Ebenen im Benutzer-XML                    | leer in `.env` = kein Suffix |
| `EMAIL_ERROR_NOTIFICATION_TO`                   | string  | Empfaenger fuer Fehlerbenachrichtigungen                                         | leer = deaktiviert         |
| `EMAIL_FROM`                                    | string  | Absenderadresse fuer SMTP                                                        | leer                        |
| `EMAIL_HOST`                                    | string  | SMTP-Host                                                                        | leer                        |
| `EMAIL_PORT`                                    | number  | SMTP-Port                                                                        | `587`                       |
| `EMAIL_SECURE`                                  | boolean | SMTP-TLS (z.B. 465 = `true`, 587 = `false`)                                      | `false`                     |
| `EMAIL_USER`                                    | string  | SMTP-Benutzer                                                                    | leer                        |
| `EMAIL_PASSWORD`                                | string  | SMTP-Passwort                                                                    | leer                        |

## Sortierung

- Sortierung ist nur aktiv, wenn mindestens eine der `GROUP_SORT_*` bzw. `USER_SORT_*` Variablen gesetzt ist.
- Gruppen: Vergleich ueber den Basisnamen; priorisierte Schluesselwoerter greifen fuer exakte Gruppennamen (z.B. `POSTSTELLE`) und fuer Suffixe am Ende (z.B. `_LEITUNG`). Locale `de-DE` mit optionaler Numerik.
- Benutzer: Sortierung nach Nachname oder Gesamtname; Schluesselwoerter in `display_name` koennen priorisiert werden.

## Filter-Logik

- Allowlist/Blocklist sind exakte Vergleiche.
- Prioritaet: `ALLOWLIST` hat Vorrang vor `BLOCKLIST`.
- `FILTER_GROUP_ALLOWLIST` erzwingt Gruppen in der Ausgabe, auch wenn andere Gruppenfilter nicht matchen.
- Benutzer in Gruppen aus `FILTER_GROUP_ALLOWLIST` werden ebenfalls erzwungen eingeschlossen.
- `FILTER_USERS_ALLOWLIST` erzwingt Benutzer in der Ausgabe, auch wenn andere Benutzerfilter nicht matchen.
- Regex-Listen bestehen aus einzelnen Mustern, getrennt durch `|`.
- `FILTER_GROUPS_MIN_USERS` entfernt Gruppen nach dem Laden der Mitgliedschaften; Gruppen aus `FILTER_GROUP_ALLOWLIST` sind davon ausgenommen.
- Hinweis: `FILTER_GROUPS_WITH_MATCHING_REGEX` und `FILTER_GROUPS_NOT_MATCHING_REGEX` verhalten sich aktuell gleich (Gruppe bleibt nur, wenn mindestens ein Regex matcht).

## E-Mail-Benachrichtigungen

- Wenn `EMAIL_ERROR_NOTIFICATION_TO` gesetzt ist, wird bei Fehlern versucht eine Mail zu senden.
- SMTP wird ueber `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASSWORD` und optional `EMAIL_FROM` konfiguriert.
- Der SMTP-Transport wird nur initialisiert, wenn `EMAIL_HOST`, `EMAIL_USER` und `EMAIL_PASSWORD` gesetzt sind.
- Wenn der Transport nicht konfiguriert ist, wird der Versand uebersprungen und eine Warnung geloggt.

## Output-Details

- Es werden zwei Dateien erzeugt (konfigurierbar ueber `POSTAL_PATH_XML_USERS` und `POSTAL_PATH_XML_GROUPS`).
- Falls eine der Dateien bereits existiert, werden die Root-Attribute als Template uebernommen.
- Benutzer-XML enthaelt pro Gruppe eine Ebene und darunter die Benutzer, inklusive Restriction-CDATAs fuer `returnvalue`.

## enaio®-Setup (Posteingang): Organisationseinheit & Sachbearbeitung

In enaio® werden Baum-/Katalog-Felder haeufig ueber das Add-on **axaddxmltree** (XML-Katalog) gefuellt. Dieses Projekt erzeugt dafuer passende Baumstrukturen:

- `posteingang-organisationseinheit.xml` fuer das Feld **Organisationseinheit** (wenn so konfiguriert)
- `posteingang-sachbearbeitung.xml` fuer das Feld **Sachbearbeitung** (wenn so konfiguriert)

Feldlogik:

- Organisationseinheit: Ebene = Gruppe (selectable), `returnvalue` = Gruppenname
- Sachbearbeitung: Ebene 1 = Gruppe (nicht selectable), `returnvalue` = `gruppenname + RETURNVALUE_GROUP_SUFFIX` (Standard `(g)` falls in `.env` leer).
- Sachbearbeitung: Ebene 2 = Benutzer (selectable), `returnvalue` = `username + RETURNVALUE_USER_SUFFIX` (Standard kein Suffix falls in `.env` leer), `name` = `display_name`

Wichtig: `posteingang-sachbearbeitung.xml` schreibt pro Gruppen-Ebene eine `Restriction` als CDATA. Das ermoeglicht eine wertabhaengige Einschraenkung im Benutzerbaum (abhängig von der gewaehlten Organisationseinheit). Die konkrete Konfiguration haengt von eurer enaio®-Version bzw. Client-Konfiguration ab.

## Ablage/Referenz der XML-Dateien

Laut Dokumentation wird die XML-Datei im Datenverzeichnis unter `\\etc\\` abgelegt. Standardmaessig heisst sie `axaddxmltree<HEX-FeldGUID>.xml` (also `axaddxmltree` plus die GUID des Felds in Hex). Alternativ kann der Dateiname in der Add-on-Konfiguration vorgegeben werden (z.B. `EXTRA00=posteingang-organisationseinheit.xml`), damit stabile Namen wie `posteingang-organisationseinheit.xml` und `posteingang-sachbearbeitung.xml` moeglich sind.

Hinweise aus der Doku:

- Das Catalog Add-on (`axaddxmltree`) ist nur fuer ANSI-Installationen verfuegbar und wird in einer folgenden Version abgekündigt (Ersatz: Treeview add-on).
- In Multi-Server-Installationen muessen die Katalog-Dateien in alle relevanten `\\etc\\`-Verzeichnisse repliziert/kopiert werden.

Referenzen (Hersteller-Doku):

- Optimal Systems: Catalog Add-on (axaddxmltree): https://help.optimal-systems.com/enaio/v1110/admin/editor/en/dialogelemente/addons/katalog.htm
- Optimal Systems: Add-ons for Text Fields (Hinweis Unicode/ANSI): https://help.optimal-systems.com/enaio/v110/admin/editor/en/dialogelemente/addonstextfelder.htm
- Optimal Systems: Catalog data saved in an XML file: https://help.optimal-systems.com/enaio-admin/en/24.0/admin/-catalog-data-saved-in-an-xml-file.html

## Mini-Beispiel (Ausschnitt)

```xml
<axaddxmltree>
  <ebene name="IT" returnvalue="IT" selectable="1" />
</axaddxmltree>
```

## Scripts

- `npm run build`: TypeScript-Compile nach `dist/`.
- `npm run serve`: `tsc` und danach Start aus `dist/index.js`.
- `npm run nodemon`: Startet `nodemon -L`.

## Hinweis zu Listenwerten

- Regex-Listen: Werte mit `|` trennen (z.B. `FILTER_GROUPS_NOT_MATCHING_REGEX=^01_\\d+$|^11_\\d+$`).
- Namenslisten (`*_ALLOWLIST`, `*_BLOCKLIST`, `FILTER_USERS_WITH_GROUP_*`, `GROUP_SORT_KEYWORDS_FIRST`): `|` **oder** `,` moeglich (z.B. `FILTER_GROUP_ALLOWLIST=GRP_A|GRP_B` oder `FILTER_GROUP_ALLOWLIST=GRP_A, GRP_B`).
