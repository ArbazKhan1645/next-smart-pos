import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum LayoutType {
  basketLeft, // Default: Basket left, Content right
  basketRight, // Basket right, Content left
}

class LayoutConfigService extends GetxService {
  static LayoutConfigService get instance => Get.find();

  final Rx<LayoutType> currentLayout = LayoutType.basketLeft.obs;
  final RxBool isLoading = false.obs;

  static const String _layoutKey = 'pos_layout_type';

  @override
  void onInit() {
    super.onInit();
    loadLayout();
  }

  Future<void> loadLayout() async {
    try {
      isLoading.value = true;
      final prefs = await SharedPreferences.getInstance();
      final savedLayout = prefs.getString(_layoutKey);
      
      if (savedLayout != null) {
        currentLayout.value = LayoutType.values.firstWhere(
          (e) => e.toString() == savedLayout,
          orElse: () => LayoutType.basketLeft,
        );
      }
    } catch (e) {
      print('Error loading layout: $e');
    } finally {
      isLoading.value = false;
    }
  }

  Future<void> saveLayout(LayoutType layout) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_layoutKey, layout.toString());
      currentLayout.value = layout;
    } catch (e) {
      print('Error saving layout: $e');
    }
  }

  void showLayoutSelector(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _LayoutSelectorDialog(),
    );
  }
}

class _LayoutSelectorDialog extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final service = LayoutConfigService.instance;

    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
      ),
      child: Container(
        width: 600,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.view_quilt_rounded,
                  color: Theme.of(context).colorScheme.primary,
                  size: 28,
                ),
                const SizedBox(width: 12),
                Text(
                  'Layout Selection',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Choose your preferred layout',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[600],
              ),
            ),
            const SizedBox(height: 32),
            Obx(() {
              return Row(
                children: [
                  Expanded(
                    child: _LayoutOption(
                      layoutType: LayoutType.basketLeft,
                      title: 'Basket Left',
                      isSelected:
                          service.currentLayout.value == LayoutType.basketLeft,
                      onTap: () async {
                        await service.saveLayout(LayoutType.basketLeft);
                        Navigator.pop(context);
                        Get.snackbar(
                          'Layout Changed',
                          'Basket positioned on left side',
                          snackPosition: SnackPosition.BOTTOM,
                          duration: const Duration(seconds: 2),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: _LayoutOption(
                      layoutType: LayoutType.basketRight,
                      title: 'Basket Right',
                      isSelected:
                          service.currentLayout.value == LayoutType.basketRight,
                      onTap: () async {
                        await service.saveLayout(LayoutType.basketRight);
                        Navigator.pop(context);
                        Get.snackbar(
                          'Layout Changed',
                          'Basket positioned on right side',
                          snackPosition: SnackPosition.BOTTOM,
                          duration: const Duration(seconds: 2),
                        );
                      },
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _LayoutOption extends StatelessWidget {
  final LayoutType layoutType;
  final String title;
  final bool isSelected;
  final VoidCallback onTap;

  const _LayoutOption({
    required this.layoutType,
    required this.title,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected
                ? Theme.of(context).colorScheme.primary
                : Colors.grey[300]!,
            width: isSelected ? 3 : 1.5,
          ),
          borderRadius: BorderRadius.circular(16),
          color: isSelected
              ? Theme.of(context).colorScheme.primary.withOpacity(0.05)
              : Colors.white,
        ),
        child: Column(
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isSelected
                    ? Theme.of(context).colorScheme.primary
                    : Colors.grey[800],
              ),
            ),
            const SizedBox(height: 16),
            _LayoutSkeleton(layoutType: layoutType, isSelected: isSelected),
            const SizedBox(height: 16),
            if (isSelected)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle, color: Colors.white, size: 16),
                    SizedBox(width: 6),
                    Text(
                      'Active',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _LayoutSkeleton extends StatelessWidget {
  final LayoutType layoutType;
  final bool isSelected;

  const _LayoutSkeleton({
    required this.layoutType,
    required this.isSelected,
  });

  @override
  Widget build(BuildContext context) {
    final basketOnLeft = layoutType == LayoutType.basketLeft;
    final primaryColor = Theme.of(context).colorScheme.primary;
    final accentColor = isSelected ? primaryColor : Colors.grey[400]!;

    return Container(
      height: 120,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey[300]!),
        borderRadius: BorderRadius.circular(8),
        color: Colors.grey[50],
      ),
      child: Row(
        children: basketOnLeft
            ? [
                _BasketSection(color: accentColor),
                const SizedBox(width: 4),
                _MainContentSection(color: accentColor.withOpacity(0.5)),
              ]
            : [
                _MainContentSection(color: accentColor.withOpacity(0.5)),
                const SizedBox(width: 4),
                _BasketSection(color: accentColor),
              ],
      ),
    );
  }
}

class _BasketSection extends StatelessWidget {
  final Color color;

  const _BasketSection({required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: 35,
      child: Container(
        margin: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: color.withOpacity(0.2),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: color, width: 2),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_basket, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              'Basket',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MainContentSection extends StatelessWidget {
  final Color color;

  const _MainContentSection({required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      flex: 65,
      child: Container(
        margin: const EdgeInsets.all(8),
        child: Row(
          children: [
            Expanded(
              flex: 25,
              child: Container(
                decoration: BoxDecoration(
                  color: color.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: color, width: 1.5),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.category, color: color, size: 20),
                    const SizedBox(height: 4),
                    Text(
                      'Categories',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              flex: 75,
              child: Container(
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: color, width: 1.5),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.grid_view, color: color, size: 20),
                    const SizedBox(height: 4),
                    Text(
                      'Products',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w600,
                        color: color,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}