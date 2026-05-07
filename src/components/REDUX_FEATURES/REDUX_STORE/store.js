import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../REDUX_SLICES/authSlice";
import adminProductCreateReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminProductCreateSlice";
import adminGetProductsReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminGetProductsSlice";
import adminArchivedReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminArchivedSlice"
import adminEditProductReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminEditProductSlice";
import categoriesReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/categoriesSlice";
import adminBulkUploadReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/bulkUploadSlice";
import { userAnalyticsApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/userAnalyticsApi";
import adminAuthReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminAuthSlice";
import { adminAuthApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminAuthApi";
import { seoAnalyticsApi, seoUiReducer } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/adminSeoAnalytics";
import adminOrdersUiReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersSlice";
import { adminOrdersApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/order_management/adminOrdersApi";
import staffReducer from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/staffSlice";
import { wholesalerApi } from "../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/wholesalerApi/wholesalerApi";
import couponReducer from '../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/couponApi/CouponSlice';
import { couponApi } from '../../ADMIN_SEGMENT/ADMIN_REDUX_MANAGEMENT/couponApi/couponApi';


// USER REDUCER 
import userProductsReducer from "../REDUX_SLICES/userProductsSlice";
import userCategoriesReducer from "../REDUX_SLICES/userCategoriesSlice";
import userWishlistReducer from '../REDUX_SLICES/userWishlistSlice';
import userCartReducer from '../REDUX_SLICES/userCartSlice';
import userAddressReducer from '../REDUX_SLICES/Useraddressslice';
import { searchApi } from '../REDUX_SLICES/searchApi';
import checkoutReducer from '../REDUX_SLICES/checkoutSlice/checkoutSlice';
import orderReducer from '../REDUX_SLICES/orderSlice/orderSlice';
import productTagsReducer from "../REDUX_SLICES/productTagsSlice"



const store = configureStore({
  reducer: {
    auth: authReducer,   //user authentication reducer
    adminProductCreate: adminProductCreateReducer,
    staff: staffReducer,
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
    [seoAnalyticsApi.reducerPath]: seoAnalyticsApi.reducer,
    seoUi: seoUiReducer,
    adminOrdersUi: adminOrdersUiReducer,
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

  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      searchApi.middleware,
      userAnalyticsApi.middleware,
      adminAuthApi.middleware,
      seoAnalyticsApi.middleware,
      adminOrdersApi.middleware,
      wholesalerApi.middleware,
      couponApi.middleware,
    ),
  devTools: import.meta.env.MODE !== "production", // Redux DevTools only in dev
});

export default store;

// import { configureStore } from "@reduxjs/toolkit";

// const store = configureStore({
//   reducer: {
//     // Add your reducers here
//   },
// });

// export default store;