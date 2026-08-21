import {
  GraphQLBoolean, GraphQLInt, GraphQLList,
  GraphQLObjectType, GraphQLString,
} from "graphql";
import { SITES } from "../../utils/constants";
import { scrapeContent as hentaifoxGetScrape } from "../../scraper/hentaifox/hentaifoxGetController";
import { scrapeContent as hentaifoxSearchScrape } from "../../scraper/hentaifox/hentaifoxSearchController";

const HentaifoxGetDataType = new GraphQLObjectType({
  name: "HentaifoxGetData",
  fields: {
    title: { type: GraphQLString }, id: { type: GraphQLInt }, tags: { type: new GraphQLList(GraphQLString) },
    type: { type: GraphQLString }, total: { type: GraphQLInt }, image: { type: new GraphQLList(GraphQLString) },
  },
});

const HentaifoxGetResultType = new GraphQLObjectType({
  name: "HentaifoxGetResult",
  fields: { success: { type: GraphQLBoolean }, data: { type: HentaifoxGetDataType }, source: { type: GraphQLString } },
});

const HentaifoxSearchDataType = new GraphQLObjectType({
  name: "HentaifoxSearchData",
  fields: {
    title: { type: GraphQLString }, cover: { type: GraphQLString }, id: { type: GraphQLInt },
    language: { type: GraphQLString }, category: { type: GraphQLString }, link: { type: GraphQLString },
  },
});

const HentaifoxSearchResultType = new GraphQLObjectType({
  name: "HentaifoxSearchResult",
  fields: {
    success: { type: GraphQLBoolean }, data: { type: new GraphQLList(HentaifoxSearchDataType) },
    page: { type: GraphQLInt }, sort: { type: GraphQLString }, source: { type: GraphQLString },
  },
});

export const HentaifoxQueriesType = new GraphQLObjectType({
  name: "HentaifoxQueries",
  fields: {
    get: {
      type: HentaifoxGetResultType,
      args: { book: { type: GraphQLInt } },
      resolve: async (_: unknown, args: { book: number }) =>
        hentaifoxGetScrape(`${SITES.HENTAIFOX}/gallery/${args.book}/`),
    },
    search: {
      type: HentaifoxSearchResultType,
      args: {
        key: { type: GraphQLString },
        page: { type: GraphQLInt, defaultValue: 1 },
        sort: { type: GraphQLString, defaultValue: "latest" },
      },
      resolve: async (_: unknown, args: { key: string; page: number; sort: string }) =>
        hentaifoxSearchScrape(`${SITES.HENTAIFOX}/search/?q=${args.key}&sort=${args.sort}&page=${args.page}`),
    },
    random: {
      type: HentaifoxGetResultType,
      resolve: async () => hentaifoxGetScrape(`${SITES.HENTAIFOX}/random`),
    },
  },
});