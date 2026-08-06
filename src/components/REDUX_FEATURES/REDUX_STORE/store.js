import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../REDUX_SLICES/authSlice";
import adminProductCreateReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminProductCreateSlice";
import adminGetProductsReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice";
import adminArchivedReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminArchivedSlice"
import adminEditProductReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminEditProductSlice";
import categoriesReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/categoriesSlice";
import adminBulkUploadReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/bulkUploadSlice";
import { userAnalyticsApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/userAnalyticsApi";
import { outOfStockInquiryApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/outOfStockInquiryApi";
import adminAuthReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { adminAuthApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminAuthApi";
import { seoAnalyticsApi, seoUiReducer } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminSeoAnalytics";
import adminOrdersUiReducer, { adminRtoUiReducer } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersSlice";
import { adminOrdersApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import staffReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/staffSlice";
import { wholesalerApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/wholesalerApi/wholesalerApi";
import couponReducer from '../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/couponApi/CouponSlice';
import { couponApi } from '../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/couponApi/couponApi';
import staffPasswordReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/staffPasswordSlice";
import adminSelfPasswordReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminSelfPasswordSlice";

// USER REDUCER 
import userProductsReducer from "../REDUX_SLICES/userProductsSlice";
import userCategoriesReducer from "../REDUX_SLICES/userCategoriesSlice";
import userWishlistReducer from '../REDUX_SLICES/userWishlistSlice';
import userCartReducer from '../REDUX_SLICES/userCartSlice';
import userAddressReducer from '../REDUX_SLICES/Useraddressslice';
import { searchApi } from '../REDUX_SLICES/searchApi';
import { notificationsApi } from '../REDUX_SLICES/notificationsApi';
import checkoutReducer from '../REDUX_SLICES/checkoutSlice/checkoutSlice';
import orderReducer from '../REDUX_SLICES/orderSlice/orderSlice';
import productTagsReducer from "../REDUX_SLICES/productTagsSlice"



const store = configureStore({
  reducer: {
    auth: authReducer,   //user authentication reducer
    adminProductCreate: adminProductCreateReducer,
    staff: staffReducer,
    staffPassword: staffPasswordReducer,
    adminSelfPassword: adminSelfPasswordReducer,
    adminGetProducts: adminGetProductsReducer,
    adminEditProduct: adminEditProductReducer,
    adminArchived: adminArchivedReducer,
    categories: categoriesReducer,
    adminBulkUpload: adminBulkUploadReducer,
    adminAuth: adminAuthReducer,
    coupon: couponReducer,
    [couponApi.reducerPath]: couponApi.reducer,
    [adminAuthApi.reducerPath]: adminAuthApi.reducer,
    [userAnalyticsApi.reducerPath]: userAnalyticsApi.reducer,
    [outOfStockInquiryApi.reducerPath]: outOfStockInquiryApi.reducer,
    [seoAnalyticsApi.reducerPath]: seoAnalyticsApi.reducer,
    seoUi: seoUiReducer,
    adminOrdersUi: adminOrdersUiReducer,
    adminRtoUi: adminRtoUiReducer,
        productTags: productTagsReducer, // ← yeh hona chahiye
    [adminOrdersApi.reducerPath]: adminOrdersApi.reducer,
    [wholesalerApi.reducerPath]: wholesalerApi.reducer,



    // USER REDUCER 
    userProducts: userProductsReducer,
    userCategories: userCategoriesReducer,
    userWishlist: userWishlistReducer,
    userCart: userCartReducer,
    userAddress: userAddressReducer,
    checkout: checkoutReducer,
    orders: orderReducer,
    [searchApi.reducerPath]: searchApi.reducer,
    [notificationsApi.reducerPath]: notificationsApi.reducer,

  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Bulk upload thunks pass File/Blob via meta.arg; those must not live in
      // Redux state, but RTK still inspects action meta — ignore only that path.
      serializableCheck: {
        ignoredActionPaths: ['meta.arg', 'meta.arg.csvFile', 'meta.arg.zipFile'],
      },
    }).concat(
      searchApi.middleware,
      userAnalyticsApi.middleware,
      outOfStockInquiryApi.middleware,
      adminAuthApi.middleware,
      seoAnalyticsApi.middleware,
      adminOrdersApi.middleware,
      wholesalerApi.middleware,
      couponApi.middleware,
      notificationsApi.middleware,
    ),
  devTools: import.meta.env.MODE !== "production", // Redux DevTools only in dev
});

export default store;

