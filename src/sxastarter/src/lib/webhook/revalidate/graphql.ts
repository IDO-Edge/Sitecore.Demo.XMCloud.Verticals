export const GetItemUrl = /* GraphQL */ `
  query GetItemUrl($id: String, $lang: String = "en") {
    item(path: $id, language: $lang) {
      url {
        path
        siteName
        hostName
        scheme
      }
      id
    }
  }
`;
