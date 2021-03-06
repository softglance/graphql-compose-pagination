/* @flow */
/* eslint-disable no-param-reassign */

import { Resolver } from 'graphql-compose';
import { GraphQLInt } from 'graphql-compose/lib/graphql';
import { userTypeComposer } from '../__mocks__/userTypeComposer';
import { preparePaginationResolver } from '../paginationResolver';

describe('paginationResolver', () => {
  const spyFindManyResolve = jest.spyOn(userTypeComposer.getResolver('findMany'), 'resolve');
  const spyCountResolve = jest.spyOn(userTypeComposer.getResolver('count'), 'resolve');
  const paginationResolver = preparePaginationResolver(userTypeComposer, {
    countResolverName: 'count',
    findResolverName: 'findMany',
    perPage: 5,
  });

  describe('definition checks', () => {
    it('should return Resolver', () => {
      expect(paginationResolver).toBeInstanceOf(Resolver);
    });

    it('should throw error if first arg is not TypeComposer', () => {
      // $FlowFixMe
      expect(() => preparePaginationResolver(123)).toThrowError(
        'should be instance of TypeComposer'
      );
    });

    it('should throw error if opts.countResolverName are empty', () => {
      // $FlowFixMe
      expect(() => preparePaginationResolver(userTypeComposer, {})).toThrowError(
        'should have option `opts.countResolverName`'
      );
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() =>
        preparePaginationResolver(userTypeComposer, {
          countResolverName: 'countDoesNotExists',
          findResolverName: 'findMany',
        })
      ).toThrowError("does not have resolver with name 'countDoesNotExists'");
    });

    it('should throw error if opts.findResolverName are empty', () => {
      expect(() =>
        // $FlowFixMe
        preparePaginationResolver(userTypeComposer, {
          countResolverName: 'count',
        })
      ).toThrowError('should have option `opts.findResolverName`');
    });

    it('should throw error if resolver opts.countResolverName does not exists', () => {
      expect(() =>
        preparePaginationResolver(userTypeComposer, {
          countResolverName: 'count',
          findResolverName: 'findManyDoesNotExists',
        })
      ).toThrowError("does not have resolver with name 'findManyDoesNotExists'");
    });
  });

  describe('resolver basic properties', () => {
    it('should have name `pagination`', () => {
      expect(paginationResolver.name).toBe('pagination');
    });

    it('should have kind `query`', () => {
      expect(paginationResolver.kind).toBe('query');
    });

    it('should have type to be ConnectionType', () => {
      // $FlowFixMe
      expect(paginationResolver.type.name).toBe('UserPagination');
    });
  });

  describe('resolver args', () => {
    it('should have `page` arg', () => {
      // $FlowFixMe
      expect(paginationResolver.getArg('page').type).toBe(GraphQLInt);
    });

    it('should have `perPage` arg', () => {
      // $FlowFixMe
      expect(paginationResolver.getArg('perPage').type).toBe(GraphQLInt);
    });
  });

  describe('call of resolvers', () => {
    let spyResolveParams;
    let mockedpaginationResolver;
    let findManyResolverCalled;
    let countResolverCalled;

    beforeEach(() => {
      findManyResolverCalled = false;
      countResolverCalled = false;
      const mockedFindMany = userTypeComposer
        .getResolver('findMany')
        .wrapResolve(next => resolveParams => {
          findManyResolverCalled = true;
          spyResolveParams = resolveParams;
          return next(resolveParams);
        });
      const mockedCount = userTypeComposer
        .getResolver('findMany')
        .wrapResolve(next => resolveParams => {
          countResolverCalled = true;
          spyResolveParams = resolveParams;
          return next(resolveParams);
        });
      userTypeComposer.setResolver('mockedFindMany', mockedFindMany);
      userTypeComposer.setResolver('mockedCount', mockedCount);
      mockedpaginationResolver = preparePaginationResolver(userTypeComposer, {
        countResolverName: 'mockedCount',
        findResolverName: 'mockedFindMany',
      });
    });

    it('should pass to findMany args.sort', async () => {
      await mockedpaginationResolver.resolve({
        args: {
          sort: { name: 1 },
          first: 3,
        },
        projection: {
          items: true,
        },
      });
      expect(spyResolveParams.args.sort.name).toBe(1);
    });

    it('should pass to findMany projection from `items` on top level', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          items: {
            name: true,
            age: true,
          },
        },
      });
      expect(spyResolveParams.projection.name).toBe(true);
      expect(spyResolveParams.projection.age).toBe(true);
    });

    it('should pass to findMany custom projections to top level', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          items: true,
          score: { $meta: 'textScore' },
        },
      });
      expect(spyResolveParams.projection.score).toEqual({ $meta: 'textScore' });
    });

    it('should call count but not findMany when only count is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          count: true,
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count but not findMany when only pageInfo.itemCount is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          pageInfo: {
            itemCount: true,
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count but not findMany when only pageInfo.pageCount is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          pageInfo: {
            itemCount: true,
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(false);
    });

    it('should call count and findMany resolver when count and items is projected', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          count: true,
          items: {
            name: true,
            age: true,
          },
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany and not count when arbitrary top level fields are projected without count', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          name: true,
          age: true,
        },
      });
      expect(countResolverCalled).toBe(false);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany and count when arbitrary top level fields are projected with count', async () => {
      await mockedpaginationResolver.resolve({
        args: {},
        projection: {
          count: true,
          name: true,
          age: true,
        },
      });
      expect(countResolverCalled).toBe(true);
      expect(findManyResolverCalled).toBe(true);
    });

    it('should call findMany but not count resolver when first arg is used', async () => {
      await mockedpaginationResolver.resolve({
        args: { first: 1 },
        projection: {
          edges: {
            node: {
              name: true,
              age: true,
            },
          },
        },
      });
      expect(countResolverCalled).toBe(false);
      expect(findManyResolverCalled).toBe(true);
    });
  });

  describe('filter tests with resolve', () => {
    it('should pass `filter` arg to `findResolverfindMany` and `count` resolvers', async () => {
      spyFindManyResolve.mockClear();
      spyCountResolve.mockClear();
      await paginationResolver.resolve({
        args: {
          filter: {
            gender: 'm',
          },
        },
        projection: {
          count: true,
          items: {
            name: true,
          },
        },
      });
      expect(spyFindManyResolve.mock.calls).toEqual([
        [
          {
            args: { filter: { gender: 'm' }, limit: 6 },
            projection: { count: true, items: { name: true }, name: true },
          },
        ],
      ]);
      expect(spyCountResolve.mock.calls).toEqual([
        [
          {
            args: { filter: { gender: 'm' } },
            projection: { count: true, items: { name: true } },
            rawQuery: undefined,
          },
        ],
      ]);
    });

    it('should add additional filtering', async () => {
      const result = await paginationResolver.resolve({
        args: {
          filter: {
            gender: 'm',
          },
          sort: { id: 1 },
        },
        projection: {
          count: true,
          items: {
            name: true,
          },
        },
      });
      expect(result.items).toHaveLength(5);
      expect(result.items[0]).toEqual({
        id: 1,
        name: 'user01',
        age: 11,
        gender: 'm',
      });
      expect(result.items[4]).toEqual({
        id: 9,
        name: 'user09',
        age: 19,
        gender: 'm',
      });
      expect(result.count).toBe(8);
    });
  });

  describe('sort tests with resolve', () => {
    it('should pass `sort` arg to `findResolverfindMany` but not to `count` resolvers', async () => {
      spyFindManyResolve.mockClear();
      spyCountResolve.mockClear();
      await paginationResolver.resolve({
        args: {
          sort: { _id: 1 },
        },
        projection: {
          count: true,
          items: {
            name: true,
          },
        },
      });
      expect(spyFindManyResolve.mock.calls).toEqual([
        [
          {
            args: { limit: 6, sort: { _id: 1 } },
            projection: { count: true, items: { name: true }, name: true },
          },
        ],
      ]);
      expect(spyCountResolve.mock.calls).toEqual([
        [
          {
            args: { filter: {} },
            projection: { count: true, items: { name: true } },
            rawQuery: undefined,
          },
        ],
      ]);
    });
  });

  describe('resolver payload', () => {
    it('should have correct pageInfo for first page', async () => {
      const result = await paginationResolver.resolve({
        args: {},
        projection: {
          pageInfo: {
            currentPage: true,
            perPage: true,
            itemCount: true,
            pageCount: true,
            hasPreviousPage: true,
            hasNextPage: true,
          },
        },
      });

      expect(result.pageInfo).toEqual({
        currentPage: 1,
        hasNextPage: true,
        hasPreviousPage: false,
        itemCount: 15,
        pageCount: 3,
        perPage: 5,
      });
    });

    it('should have correct pageInfo for last page', async () => {
      const result = await paginationResolver.resolve({
        args: { page: 3 },
        projection: {
          pageInfo: {
            currentPage: true,
            perPage: true,
            itemCount: true,
            pageCount: true,
            hasPreviousPage: true,
            hasNextPage: true,
          },
        },
      });

      expect(result.pageInfo).toEqual({
        currentPage: 3,
        hasNextPage: false,
        hasPreviousPage: true,
        itemCount: 15,
        pageCount: 3,
        perPage: 5,
      });
    });
  });
});
