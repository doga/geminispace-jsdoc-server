
type ModuleTag = {
  kind: 'module',
  name: string,
};

type TypeTag = {
  kind: 'type',
  type: string,
};

type SeeTag = {
  kind: 'see',
  doc: string, // TODO regex
};

type ExampleTag = {
  kind: 'example',
  doc: string,
};

type ParamTag = {
  kind: 'param',
  name: string,
  type?: string,
  doc: string,
};

type ReturnTag = {
  kind: 'return',
  type: string,
};

type ThrowsTag = {
  kind: 'throws',
  type: string,
};

type UnsupportedTag = {
  kind: 'unsupported',
  value: string,
};

type Tag = ModuleTag | TypeTag | SeeTag | ReturnTag | ParamTag | ExampleTag | ThrowsTag | UnsupportedTag;

type JsDoc = {
  doc?: string,
  tags: {
    [key: number]: Tag,
  },
};

type TsTypeRef = {
  repr: string,
  kind: 'typeRef',
  typeRef: {
    typeName: string,
  },
};

type TsTypeArray = {
  repr: string,
  kind: 'array',
  array: {
    repr: string,
    kind: 'keyword',
    keyword: string
  }
};

type TsType = TsTypeRef | TsTypeArray;

type Param = {
  kind: 'identifier',
  name: string,
  optional: boolean,
  tsType: null,
};

type Constructor = {
  jsDoc?: JsDoc,
  params: {
    [key: number]: Param,
  },
};

type FunctionDef = {
  params: {
    [key: number]: Param,
  },
  returnType: string | null, // TODO verify
  isAsync: boolean,
};

type MethodDef = {
  jsDoc?: JsDoc,
  name: string,
  kind: 'getter' | 'setter' | 'method',
  functionDef: FunctionDef,
  isStatic: boolean,
};

type PropertyDef = {
  jsDoc?: JsDoc,
  name: string,
  isStatic: boolean,
  kind: undefined,
  tsType: TsType | null
};

type ClassDef = {
  jsDoc?: JsDoc,
  extends?: string,
  implements: {
    [key: number]: string,
  },
  constructors: {
    [key: number]: Constructor,
  },
  properties: {
    [key: number]: PropertyDef,
  },
  methods: {
    [key: number]: MethodDef,
  },
};

type DeclarationKind =
  | 'export'
  | 'private';

type ModuleDefinition = {
  jsDoc?: JsDoc,
  kind: 'moduleDoc',
  declarationKind: DeclarationKind,
};

type ClassDefinition = {
  jsDoc?: JsDoc,
  kind           : 'class',
  declarationKind: DeclarationKind,
  name           : string,
  classDef       : ClassDef,
};

type VariableDefinition = {
  jsDoc?: JsDoc,
  name: string,
  kind: "variable",
  variableDef: {
    tsType: TsType | null,
    kind: 'const' | 'var'
  },
  declarationKind: DeclarationKind,
};

type Definition = 
  | ModuleDefinition
  | ClassDefinition
  | VariableDefinition;

type JsDocDocument = {
  version: number,
  nodes  : Definition[]
}

export type {
  JsDoc, Tag, SeeTag, ExampleTag, ReturnTag, ParamTag, UnsupportedTag,
  Param,
  TsType, TsTypeArray, TsTypeRef,
  Constructor, FunctionDef, MethodDef, PropertyDef,
  ClassDef, DeclarationKind,
  Definition, ClassDefinition, ModuleDefinition, VariableDefinition,
  JsDocDocument
};
