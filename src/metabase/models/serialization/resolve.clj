(ns metabase.models.serialization.resolve
  "Protocols, dynamic vars, and portable-ID utilities for serdes FK resolution.

  This namespace has NO toucan2 dependency — it can be used by lightweight consumers
  (like the checker) that don't need the database."
  (:require
   [metabase.lib.schema.id :as lib.schema.id]
   [metabase.lib.util.match :as lib.util.match]
   ;; legacy usages -- do not use in new code
   ^{:clj-kondo/ignore [:discouraged-namespace]} [metabase.legacy-mbql.normalize :as mbql.normalize]))

(set! *warn-on-reflection* true)

;;; ============================================================
;;; Protocols
;;; ============================================================

(defprotocol SerdesExportResolver
  "Resolve database IDs to portable references during export."
  (export-fk        [this id model]        "Given a numeric FK and model, return a portable ID (string or vector).")
  (export-fk-keyed  [this id model field]  "Given a numeric ID, look up a different identifying field.")
  (export-user      [this id]              "Export a user as their email address.")
  (export-table-fk  [this table-id]        "Given a numeric table_id, return [db-name schema table-name].")
  (export-field-fk  [this field-id]        "Given a numeric field_id, return [db-name schema table-name field-name]."))

(defprotocol SerdesImportResolver
  "Resolve portable references back to database IDs during import."
  (import-fk        [this eid model]       "Given a portable ID and model, return the numeric PK.")
  (import-fk-keyed  [this portable model field] "Given a portable identifying field value, return the numeric :id.")
  (import-user      [this email]           "Import a user by email, creating if needed. Returns PK.")
  (import-table-fk  [this path]            "Given [db-name schema table-name], return numeric table_id.")
  (import-field-fk  [this path]            "Given [db-name schema table-name field-name], return numeric field_id."))

;;; ============================================================
;;; Dynamic vars — bound to resolver instances
;;; ============================================================

(def ^:dynamic *export-resolver*
  "The current `SerdesExportResolver` instance. Bound during export."
  nil)

(def ^:dynamic *import-resolver*
  "The current `SerdesImportResolver` instance. Bound during import."
  nil)

;;; ============================================================
;;; Pure predicates
;;; ============================================================

(defn entity-id?
  "Checks if the given string is a 21-character NanoID."
  [id-str]
  (boolean (and id-str
                (string? id-str)
                (re-matches #"^[A-Za-z0-9_-]{21}$" id-str))))

(defn identity-hash?
  "Returns true if s is a valid identity hash string."
  [s]
  (boolean (re-matches #"^[0-9a-fA-F]{8}$" s)))

(defn- portable-id?
  "True if the provided string is either an Entity ID or identity-hash string."
  [s]
  (and (string? s)
       (or (entity-id? s)
           (identity-hash? s))))

;;; ============================================================
;;; import-mbql — depends only on protocols, lib.util.match, lib.schema.id
;;; ============================================================

(defn- mbql-entity-reference?
  [form]
  (mbql.normalize/is-clause? #{:field :field-id :fk-> :dimension :metric :segment :measure} form))

(defn- normalize [mbql]
  (if-not (mbql-entity-reference? mbql)
    mbql
    (into [(keyword (first mbql))] (map normalize) (rest mbql))))

(defn- mbql-fully-qualified-names->ids*
  [resolver entity]
  (lib.util.match/replace-lite entity
    [#{:field-id "field-id"} fully-qualified-name]
    (mbql-fully-qualified-names->ids* resolver [:field fully-qualified-name])

    [#{:field "field"} (fully-qualified-name :guard vector?) opts]
    [:field (import-field-fk resolver fully-qualified-name) (mbql-fully-qualified-names->ids* resolver opts)]
    [#{:field "field"} (fully-qualified-name :guard vector?)]
    [:field (import-field-fk resolver fully-qualified-name)]

    {:source-field (fully-qualified-name :guard vector?)}
    (assoc &match :source-field (import-field-fk resolver fully-qualified-name))

    {:database (fully-qualified-name :guard string?)}
    (-> &match
        (assoc :database (if (= fully-qualified-name "database/__virtual")
                           lib.schema.id/saved-questions-virtual-database-id
                           (import-fk-keyed resolver fully-qualified-name :model/Database :name)))
        (->> (mbql-fully-qualified-names->ids* resolver)))

    {:card-id (entity-id :guard portable-id?)}
    (-> &match
        (assoc :card-id (import-fk resolver entity-id 'Card))
        (->> (mbql-fully-qualified-names->ids* resolver)))

    [#{:metric "metric"} (entity-id :guard portable-id?)]
    [:metric (import-fk resolver entity-id 'Card)]

    [#{:segment "segment"} (fully-qualified-name :guard portable-id?)]
    [:segment (import-fk resolver fully-qualified-name 'Segment)]

    [#{:measure "measure"} (fully-qualified-name :guard portable-id?)]
    [:measure (import-fk resolver fully-qualified-name 'Measure)]

    {:source-table (_ :guard vector?)}
    (-> &match
        (update :source-table #(import-table-fk resolver %))
        (->> (mbql-fully-qualified-names->ids* resolver)))

    {:source_table (_ :guard vector?)}
    (-> &match
        (update :source_table #(import-table-fk resolver %))
        (->> (mbql-fully-qualified-names->ids* resolver)))

    {:source-table (id :guard portable-id?)}
    (-> &match
        (assoc :source-table (str "card__" (import-fk resolver id 'Card)))
        (->> (mbql-fully-qualified-names->ids* resolver)))

    {:source_table (id :guard portable-id?)}
    (-> &match
        (assoc :source_table (str "card__" (import-fk resolver id 'Card)))
        (->> (mbql-fully-qualified-names->ids* resolver)))

    {:snippet-id (id :guard portable-id?)}
    (-> &match
        (assoc :snippet-id (import-fk resolver id 'NativeQuerySnippet))
        (->> (mbql-fully-qualified-names->ids* resolver)))))

(defn import-mbql
  "Given an MBQL expression with portable IDs, convert back to numeric IDs.
  Uses `*import-resolver*` if bound, otherwise requires a resolver argument."
  ([exported]
   (import-mbql *import-resolver* exported))
  ([resolver exported]
   (mbql-fully-qualified-names->ids* resolver exported)))
