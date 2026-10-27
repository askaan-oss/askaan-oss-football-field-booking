import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/app_colors.dart';
import 'providers/auth_provider.dart';
import 'providers/pitch_provider.dart';
import 'providers/booking_provider.dart';
import 'screens/main_tab_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi_VN', null);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => PitchProvider()),
        ChangeNotifierProvider(create: (_) => BookingProvider()),
      ],
      child: MaterialApp(
        title: 'Đặt Sân Bóng Đá',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: AppColors.background,
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.primary,
            brightness: Brightness.dark,
            primary: AppColors.primary,
            surface: AppColors.surface,
          ),
          fontFamily: 'sans-serif',
        ),
        home: const AppEntryWrapper(),
      ),
    );
  }
}

class AppEntryWrapper extends StatefulWidget {
  const AppEntryWrapper({super.key});

  @override
  State<AppEntryWrapper> createState() => _AppEntryWrapperState();
}

class _AppEntryWrapperState extends State<AppEntryWrapper> {
  @override
  void initState() {
    super.initState();
    // Tự động kiểm tra khôi phục phiên đăng nhập từ SharedPreferences
    Provider.of<AuthProvider>(context, listen: false).tryAutoLogin();
  }

  @override
  Widget build(BuildContext context) {
    // Mở thẳng MainTabScreen cho cả khách vãng lai và thành viên đã đăng nhập
    return const MainTabScreen();
  }
}
