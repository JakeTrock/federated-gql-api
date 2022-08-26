```
User {
  id: string;//if it's a subuser, the id will be [masterid]-[slaveid]

  displayname: string;

  groupname: string;//IMPORTANT: the ACL will be id:groupname NOT displayname:groupname

  email: string;

  //PW REGEX: /((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W]).{8,64})/g
  //PW MSG: "This is not a valid password(8 to 64 characters long and contains a mix of upper and lower case characters, 1 numeric and 1 special character)"
  password: string;

  createdDate: Date;//all three of these are autofilled columns(this is supported by postgres, they just need proper annotation)
  updatedDate: Date;
  deletedDate: Date;//this is for soft deletes, we want to keep users that are deleted for 6 months, just in case

  confirmed: boolean;//the user's email is confirmed
}
```

```
Resource {
  id: string;//resource id is uuid string

  aclstr: string;//the user:group that owns this resource

  aclnum: number; //three digit unix numeric ACL

  createdDate: Date;//all three of these are autofilled columns(this is supported by postgres, they just need proper annotation)
  updatedDate: Date;
  deletedDate: Date;//this is for soft deletes, we want to keep resources that are deleted for 4 months, just in case

  body: string;//field that contains all relevant data as a string
}

```