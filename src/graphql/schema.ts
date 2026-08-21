import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { NHentaiQueriesType } from "./sources/nhentai";
import { HentaifoxQueriesType } from "./sources/hentaifox";
import { AsmhentaiQueriesType } from "./sources/asmhentai";
import { Hentai2readQueriesType } from "./sources/hentai2read";
import { ThreehentaiQueriesType } from "./sources/3hentai";

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    nhentai: { type: NHentaiQueriesType, resolve: () => ({}) },
    hentaifox: { type: HentaifoxQueriesType, resolve: () => ({}) },
    asmhentai: { type: AsmhentaiQueriesType, resolve: () => ({}) },
    hentai2read: { type: Hentai2readQueriesType, resolve: () => ({}) },
    threehentai: { type: ThreehentaiQueriesType, resolve: () => ({}) },
  },
});

export const schema = new GraphQLSchema({ query: QueryType });