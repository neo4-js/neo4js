// @flow
import neo4js, { ModelInstance } from "./index";
import type { RelationType } from "./relation";

function getRelationString(label: string, relationType: RelationType) {
  if (relationType.any) {
    return `-[:${label}]-`;
  }
  return `${relationType.reverse ? "<" : ""}-[:${label}]-${relationType.reverse ? "" : ">"}`;
}

export async function get(
  instance: ModelInstance<*>,
  label: string,
  relationType: RelationType
): Promise<any> {
  const relationString = getRelationString(label, relationType);
  const result = await neo4js.run(
    `
    MATCH (a:${this.src.label} {guid:{_srcGuid}})${relationString}(b:${this.dest.label})
    RETURN b
  `,
    { _srcGuid: instance.props.guid }
  );

  if (result.length === 0) {
    return Promise.resolve(null);
  }

  if (result.length > 1) {
    return Promise.reject("hasOne has more than one relations");
  }

  return Promise.resolve(this.dest._createModelInstance(result[0].b));
}

export async function create(
  instance: ModelInstance<*>,
  label: string,
  relationType: RelationType,
  props: any
): Promise<any> {
  const destInstance = await this.dest.create(props);

  const relationString = getRelationString(label, relationType);
  const result = await neo4js.run(
    `
    MATCH (a:${this.src.label} {guid:{srcGuid}})${relationString}(b:${this.dest.label})
    DETACH DELETE b
  `,
    { srcGuid: instance.props.guid }
  );

  await neo4js.run(
    `
    MATCH
      (a:${this.src.label} {guid:{srcGuid}}),
      (b:${this.dest.label} {guid:{destGuid}})
    MERGE (a)${relationString}(b)
  `,
    { srcGuid: instance.props.guid, destGuid: destInstance.props.guid }
  );

  return Promise.resolve(destInstance);
}

export async function remove(
  instance: ModelInstance<*>,
  label: string,
  relationType: RelationType
): Promise<any> {
  const relationString = getRelationString(label, relationType);
  const result = await neo4js.run(
    `
    MATCH (a:${this.src.label} {guid:{srcGuid}})${relationString}(b:${this.dest.label})
    DETACH DELETE b
  `,
    { srcGuid: instance.props.guid }
  );

  // $FlowFixMe
  return Promise.resolve(result._stats);
}

export async function add(
  instance: ModelInstance<*>,
  label: string,
  relationType: RelationType,
  destInstance: ModelInstance<*>
): Promise<boolean> {
  const relationString = getRelationString(label, relationType);
  const result = await neo4js.run(
    `
    MATCH
      (a:${this.src.label} {guid:{srcGuid}}),
      (b:${this.dest.label} {guid:{destGuid}})
    MERGE (a)${relationString}(b)
  `,
    { srcGuid: instance.props.guid, destGuid: destInstance.props.guid }
  );

  // $FlowFixMe
  if (result._stats.relationshipsCreated === 1) {
    return Promise.resolve(true);
  }

  return Promise.resolve(false);
}

export async function hasOne(
  instance: ModelInstance<*>,
  label: string,
  relationType: RelationType
): Promise<boolean> {
  const relationString = getRelationString(label, relationType);
  const result = await neo4js.run(
    `
    MATCH
      (a:${this.src.label} {guid:{srcGuid}})${relationString}(b:${this.dest.label})
    RETURN b
  `,
    { srcGuid: instance.props.guid }
  );

  if (result.length === 1) {
    return Promise.resolve(true);
  } else if (result.length > 1) {
    return Promise.reject(
      new Error("HasOne relation has more than one relations")
    );
  }

  return Promise.resolve(false);
}

export async function update(
  instance: ModelInstance<*>,
  label: string,
  relationType: RelationType,
  newProps: any
): Promise<any> {
  const relationString = getRelationString(label, relationType);
  let props = await neo4js.run(
    `
    MATCH (a:${this.src.label} {guid:{srcGuid}})${relationString}(b:${this.dest.label})
    RETURN b
  `,
    { srcGuid: instance.props.guid }
  );

  if (props.length === 0) {
    return Promise.resolve(true);
  } else if (props.length > 1) {
    return Promise.reject(
      new Error("HasOne relation has more than one relations")
    );
  }
  props = props[0].b;

  const destInstance = await this.dest.update({ guid: props.guid }, newProps);
  if (destInstance.length === 1) {
    return Promise.resolve(destInstance[0]);
  }

  return Promise.reject(new Error("Problem with the update"));
}
