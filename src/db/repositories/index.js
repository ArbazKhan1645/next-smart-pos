import { ProductsRepository } from './productsRepository.js';
import { CategoriesRepository } from './categoriesRepository.js';
import { CustomersRepository } from './customersRepository.js';
import { StaffsRepository } from './staffsRepository.js';
import { TerminalsRepository } from './terminalRepository.js';
import { ModifiersGroupRepository } from './modifierGroupsRepository.js';
import { LocationModifiersRepository } from './locationModifiersRepository.js';
import { ModifiersRepository, JoinedModifier } from './joinedModifiersRepository.js';
import { ProductModifiersRepository, ProductModifierGroup } from './joinedModifierGroupsRepository.js';
import { DiscountsRepository } from './discountsRepository.js';
import { PrintersRepository } from './printersRepository.js';
import { PrintJobsRepository } from './printJobsRepository.js';
import { SaleChannelsRepository } from './saleChannelsRepository.js';
import { LocationsAndSaleChannelsRepository } from './locationsAndSaleChannelsRepository.js';
import { DailyReportsRepository } from './dailyReportsRepository.js';
import { BatchReportsRepository } from './batchReportsRepository.js';
import { UnitsRepository } from './unitsRepository.js';
import { ServiceRepository } from './servicesRepository.js';
import { ServiceTypeRepository } from './serviceTypeRepository.js';
import { MealDealRepository, MealDealGroupWithProducts } from './mealDealRepository.js';
import { MealDealJunctionRepository } from './mealDealJunctionRepository.js';
import { DisplayLevelsRepository } from './displayLevelsRepository.js';
import { DisplayLevelCategoriesRepository } from './displayLevelCategoriesRepository.js';
import { ModifierDisplayLevelsLocationsRepository } from './modifierDisplayLevelsLocationsRepository.js';
import { TerminalsServiceJunctionRepository } from './terminalServiceJunctionRepository.js';
import { SyncStatusRepository } from './syncStatusRepository.js';
import { ExtOrdersRepository } from './extOrdersRepository.js';
import { ExtQueryRepository } from './extQueryRepository.js';
import { PromotionRepository } from './promotionRepository.js';

export {
  ProductsRepository, CategoriesRepository, CustomersRepository, StaffsRepository,
  TerminalsRepository, ModifiersGroupRepository, LocationModifiersRepository,
  ModifiersRepository, JoinedModifier, ProductModifiersRepository, ProductModifierGroup,
  DiscountsRepository, PrintersRepository, PrintJobsRepository, SaleChannelsRepository,
  LocationsAndSaleChannelsRepository, DailyReportsRepository, BatchReportsRepository,
  UnitsRepository, ServiceRepository, ServiceTypeRepository,
  MealDealRepository, MealDealGroupWithProducts, MealDealJunctionRepository,
  DisplayLevelsRepository, DisplayLevelCategoriesRepository,
  ModifierDisplayLevelsLocationsRepository, TerminalsServiceJunctionRepository,
  SyncStatusRepository, ExtOrdersRepository, ExtQueryRepository, PromotionRepository,
};

/**
 * Wire all repositories onto a single db object.
 * Usage: const db = createDatabase(rawDb);  db.products.getAllProducts();
 */
export function createDatabase(rawDb) {
  return {
    raw: rawDb,
    products: new ProductsRepository(rawDb),
    categories: new CategoriesRepository(rawDb),
    customers: new CustomersRepository(rawDb),
    staffs: new StaffsRepository(rawDb),
    terminals: new TerminalsRepository(rawDb),
    modifierGroups: new ModifiersGroupRepository(rawDb),
    locationModifiers: new LocationModifiersRepository(rawDb),
    modifiers: new ModifiersRepository(rawDb),
    productModifiers: new ProductModifiersRepository(rawDb),
    discounts: new DiscountsRepository(rawDb),
    printers: new PrintersRepository(rawDb),
    printJobs: new PrintJobsRepository(rawDb),
    saleChannels: new SaleChannelsRepository(rawDb),
    locationsAndSaleChannels: new LocationsAndSaleChannelsRepository(rawDb),
    dailyReports: new DailyReportsRepository(rawDb),
    batchReports: new BatchReportsRepository(rawDb),
    units: new UnitsRepository(rawDb),
    services: new ServiceRepository(rawDb),
    serviceTypes: new ServiceTypeRepository(rawDb),
    mealDeal: new MealDealRepository(rawDb),
    mealDealJunction: new MealDealJunctionRepository(rawDb),
    displayLevels: new DisplayLevelsRepository(rawDb),
    displayLevelCategories: new DisplayLevelCategoriesRepository(rawDb),
    modifierDisplayLevels: new ModifierDisplayLevelsLocationsRepository(rawDb),
    terminalServiceJunction: new TerminalsServiceJunctionRepository(rawDb),
    syncStatus: new SyncStatusRepository(rawDb),
    extOrders: new ExtOrdersRepository(rawDb),
    extQuery: new ExtQueryRepository(rawDb),
    promotions: new PromotionRepository(rawDb),
  };
}
