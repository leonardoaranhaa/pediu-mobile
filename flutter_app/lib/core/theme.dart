import 'package:flutter/material.dart';

ThemeData buildPediuTheme() {
  const coral = Color(0xFFFF5A4F);
  const ink = Color(0xFF123B40);
  return ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: coral,
      brightness: Brightness.light,
      primary: coral,
      secondary: const Color(0xFFFFC857),
      surface: const Color(0xFFFFFBF5),
    ),
    scaffoldBackgroundColor: const Color(0xFFFFFBF5),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFFFFBF5),
      foregroundColor: ink,
      elevation: 0,
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE7E1D9)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: coral, width: 2),
      ),
    ),
  );
}
