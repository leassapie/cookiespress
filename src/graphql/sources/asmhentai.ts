import {
  GraphQLBoolean, GraphQLInt, GraphQLList,
  GraphQLObjectType, GraphQLString,
} from "graphql";
import { SITES } from "../../utils/constants";
import { scrapeContent as asmhentaiGetScrape } from "../../scraper/asmhentai/asmhentaiGetController";
import { scrapeContent as asmhentaiSearchScrape } from "../../scraper/asmhentai/asmhentaiSearchController";

const AsmhentaiGetDataType = new GraphQLObjectType({
  name: "AsmhentaiGetData",
  fields: {
    title: { type: GraphQLString }, id: { type: GraphQLInt }, tags: { type: new GraphQLList(GraphQLString) },
    total: { type: GraphQLInt }, image: { type: new GraphQLList(GraphQLString) }, upload_date: { type: GraphQLString },
  },
});

const AsmhentaiGetResultType = new GraphQLObjectType({
  name: "AsmhentaiGetResult",
  fields: { success: { type: GraphQLBoolean }, data: { type: AsmhentaiGetDataType }, source: { type: GraphQLString } },
});

const AsmhentaiSearchDataType = new GraphQLObjectType({
  name: "AsmhentaiSearchData",
  fields: { title: { type: GraphQLString }, id: { type: GraphQLInt } },
});

const AsmhentaiSearchResultType = new GraphQLObjectType({
  name: "AsmhentaiSearchResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: new GraphQLList(AsmhentaiSearchDataType) },
    page: { type: GraphQLInt }, sort: { type: GraphQLString }, source: { type: GraphQLString },
  },
});

export const AsmhentaiQueriesType = new GraphQLObjectType({
  name: "AsmhentaiQueries",
  fields: {
    get: {
      type: AsmhentaiGetResultType,
      args: { book: { type: GraphQLInt } },
      resolve: async (_: unknown, args: { book: number }) =>
        asmhentaiGetScrape(`${SITES.ASMHENTAI}/g/${args.book}/`),
    },
    search: {
      type: AsmhentaiSearchResultType,
      args: { key: { type: GraphQLString }, page: { type: GraphQLInt, defaultValue: 1 } },
      resolve: async (_: unknown, args: { key: string; page: number }) =>
        asmhentaiSearchScrape(`${SITES.ASMHENTAI}/search/?q=${args.key}&page=${args.page}`),
    },
    random: {
      type: AsmhentaiGetResultType,
      resolve: async () => asmhentaiGetScrape(`${SITES.ASMHENTAI}/random/`),
    },
  },
});