
type ModuleTag = {
  kind: 'module',
  name: string,
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

type Tag = ModuleTag | SeeTag | ReturnTag | ParamTag | ExampleTag | ThrowsTag | UnsupportedTag;

type JsDoc = {
  doc?: string,
  tags: {
    [key: number]: Tag,
  },
}

type Param = {
  kind: 'identifier',
  name: string,
  optional: boolean,
  tsType: string | null, // TODO verify
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
  kind: 'getter' | 'setter' | 'method', // TODO verify 'setter'
  functionDef: FunctionDef,
  isStatic: boolean,
};


type ClassDef = {
  jsDoc?: JsDoc,
  extends: string,
  implements: {
    [key: number]: string,
  },
  constructors: {
    [key: number]: Constructor,
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

type Definition = 
  | ModuleDefinition
  | ClassDefinition;

type JsDocDocument = {
  version: number,
  nodes  : Definition[]
}

export type {
  JsDoc, Tag, SeeTag, ExampleTag, ReturnTag, ParamTag, UnsupportedTag,
  Param,
  Constructor, FunctionDef, MethodDef,
  ClassDef, DeclarationKind,
  Definition, ClassDefinition, ModuleDefinition,
  JsDocDocument
};
