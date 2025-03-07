import { cacheFor } from '@ember/object/internals';

type CoreStore = import('../core-store').default;

type NotificationType = import('../record-notification-manager').NotificationType;

type Store = import('../ds-model-store').default;
type Model = InstanceType<typeof import('@ember-data/model').default>;
type StableRecordIdentifier = import('../../ts-interfaces/identifier').StableRecordIdentifier;

export default function notifyChanges(
  identifier: StableRecordIdentifier,
  value: NotificationType,
  key: string | undefined,
  record: Model,
  store: Store
) {
  if (value === 'attributes') {
    if (key) {
      notifyAttribute(store, identifier, key, record);
    } else {
      record.eachAttribute((key) => {
        notifyAttribute(store, identifier, key, record);
      });
    }
  } else if (value === 'relationships') {
    if (key) {
      let meta = record.constructor.relationshipsByName.get(key);
      notifyRelationship(store, identifier, key, record, meta);
    } else {
      record.eachRelationship((key, meta) => {
        notifyRelationship(store, identifier, key, record, meta);
      });
    }
  } else if (value === 'errors') {
    let internalModel = store._internalModelForResource(identifier);
    //TODO guard
    let errors = internalModel._recordData.getErrors!(identifier);
    record.invalidErrorsChanged(errors);
  } else if (value === 'state') {
    record.notifyPropertyChange('isNew');
    record.notifyPropertyChange('isDeleted');
  } else if (value === 'identity') {
    record.notifyPropertyChange('id');
  }
}

function notifyRelationship(store: CoreStore, identifier: StableRecordIdentifier, key: string, record: Model, meta) {
  let internalModel = store._internalModelForResource(identifier);
  if (meta.kind === 'belongsTo') {
    record.notifyPropertyChange(key);
  } else if (meta.kind === 'hasMany') {
    let manyArray = internalModel._manyArrayCache[key];

    if (manyArray) {
      manyArray.notify();

      //We need to notifyPropertyChange in the adding case because we need to make sure
      //we fetch the newly added record in case it is unloaded
      //TODO(Igor): Consider whether we could do this only if the record state is unloaded
      if (!meta.options || meta.options.async || meta.options.async === undefined) {
        record.notifyPropertyChange(key);
      }
    }
  }
}

function notifyAttribute(store: CoreStore, identifier: StableRecordIdentifier, key: string, record: Model) {
  let currentValue = cacheFor(record, key);
  let internalModel = store._internalModelForResource(identifier);
  if (currentValue !== internalModel._recordData.getAttr(key)) {
    record.notifyPropertyChange(key);
  }
}
