export type TBaseResourceProps = {
  name?: string;
  resourceType?: string;
  id?: string;
  searchParameter?: string;
};

export type TUserDetails = {
  username: string;
  scope: string;
  isAdmin: boolean;
};

export type TFieldInfo = {
  label: string;
  name: string;
  sortField?: string;
  useExactMatch?: boolean;
  columnHeader?: string;
};

export type TResourceDefinition = {
  name: string;
  description: string;
  url: string;
};
