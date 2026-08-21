import {
  GraphQLBoolean, GraphQLInt, GraphQLList,
  GraphQLObjectType, GraphQLString,
} from "graphql";
import { SITES } from "../../utils/constants";
import { scrapeContent as hentai2readGetScrape } from "../../scraper/hentai2read/hentai2readGetController";
import { scrapeContent as hentai2readSearchScrape } from "../../scraper/hentai2read/hentai2readSearchController";

const Hentai2readGetDataType = new GraphQLObjectType({
  name: "Hentai2readGetData",
  fields: { title: { type: GraphQLString }, id: { type: GraphQLString }, image: { type: new GraphQLList(GraphQLString) } },
});

const Hentai2readGetResultType = new GraphQLObjectType({
  name: "Hentai2readGetResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: Hentai2readGetDataType },
    main_url: { type: GraphQLString }, current_url: { type: GraphQLString },
    next_url: { type: GraphQLString }, previus_url: { type: GraphQLString }, source: { type: GraphQLString },
  },
});

const Hentai2readSearchDataType = new GraphQLObjectType({
  name: "Hentai2readSearchData",
  fields: {
    title: { type: GraphQLString }, cover: { type: GraphQLString }, id: { type: GraphQLString },
    link: { type: GraphQLString }, message: { type: GraphQLString },
  },
});

const Hentai2readSearchResultType = new GraphQLObjectType({
  name: "Hentai2readSearchResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: new GraphQLList(Hentai2readSearchDataType) },
    source: { type: GraphQLString },
  },
});

export const Hentai2readQueriesType = new GraphQLObjectType({
  name: "Hentai2readQueries",
  fields: {
    get: {
      type: Hentai2readGetResultType,
      args: { book: { type: GraphQLString } },
      resolve: async (_: unknown, args: { book: string }) =>
        hentai2readGetScrape(`${SITES.HENTAI2READ}/${args.book}/`),
    },
    search: {
      type: Hentai2readSearchResultType,
      args: { key: { type: GraphQLString }, page: { type: GraphQLInt, defaultValue: 1 } },
      resolve: async (_: unknown, args: { key: string }) =>
        hentai2readSearchScrape(`${SITES.HENTAI2READ}/hentai-list/search/${args.key}`),
    },
  },
});