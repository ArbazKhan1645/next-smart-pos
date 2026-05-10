import 'package:hse_pos/app/core/locators/service_locator.dart';
import 'package:hse_pos/app/databases/hsepos_database.dart';
import 'package:hse_pos/app/models/promotion_model/promotion_model.dart';
import 'package:hse_pos/app/repos/promotion_repository/promotion_repository.dart';
import 'package:hse_pos/app/services/promotions/promotion_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

class PromotionSyncService {
  static const String _tableName = 'promotions';
  static SupabaseClient get _client => Supabase.instance.client;

  final PromotionRepository promotionDatabase = PromotionRepository(
    locator<TestDatabase>(),
  );

  /// Sync local to Supabase
  Future<SyncResult> syncToSupabase() async {
    int uploaded = 0;
    int failed = 0;

    try {
      final unsynced = await promotionDatabase.getUnsynced();
      if (unsynced.isEmpty) {
        return SyncResult(uploaded: 0, downloaded: 0, failed: 0);
      }

      for (final promo in unsynced) {
        try {
          await _client.from(_tableName).upsert(promo.toJson());
          uploaded++;
        } catch (e) {
          print('Failed to sync ${promo.id}: $e');
          failed++;
        }
      }

      // Mark synced
      if (uploaded > 0) {
        final syncedIds = unsynced.take(uploaded).map((p) => p.id).toList();
        await promotionDatabase.markSynced(syncedIds);
      }
    } catch (e) {
      print('Sync to Supabase error: $e');
    }

    return SyncResult(uploaded: uploaded, downloaded: 0, failed: failed);
  }

  /// Sync from Supabase to local
  Future<SyncResult> syncFromSupabase({DateTime? since}) async {
    int downloaded = 0;

    try {
      var query = _client.from(_tableName).select();

      if (since != null) {
        query = query.gte('updated_at', since.toIso8601String());
      }

      final response = await query;

      final promotions = response
          .map((json) => PromotionModel.fromJson(json))
          .toList();

      await promotionDatabase.bulkInsert(promotions);
      downloaded = promotions.length;

      // Clear cache after sync
      PromotionService.clearCache();
    } catch (e) {
      print('Sync from Supabase error: $e');
    }

    return SyncResult(uploaded: 0, downloaded: downloaded, failed: 0);
  }

  /// Full two-way sync
  Future<SyncResult> fullSync() async {
    // First push local changes
    final uploadResult = await syncToSupabase();

    // Then pull from Supabase
    final downloadResult = await syncFromSupabase();

    return SyncResult(
      uploaded: uploadResult.uploaded,
      downloaded: downloadResult.downloaded,
      failed: uploadResult.failed,
    );
  }

  /// Delete from Supabase
  static Future<bool> deleteFromSupabase(String id) async {
    try {
      await _client.from(_tableName).delete().eq('id', id);
      return true;
    } catch (e) {
      print('Delete from Supabase error: $e');
      return false;
    }
  }

  /// Setup realtime listener
  static RealtimeChannel? _channel;

  void setupRealtimeSync({
    required Function(PromotionModel) onInsert,
    required Function(PromotionModel) onUpdate,
    required Function(String) onDelete,
  }) {
    _channel?.unsubscribe();

    _channel = _client
        .channel('promotions_changes')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: _tableName,
          callback: (payload) async {
            switch (payload.eventType) {
              case PostgresChangeEvent.insert:
                final promo = PromotionModel.fromJson(payload.newRecord);
                await promotionDatabase.insert(promo);
                onInsert(promo);
                break;
              case PostgresChangeEvent.update:
                final promo = PromotionModel.fromJson(payload.newRecord);
                promotionDatabase.updatePromotion(promo);
                onUpdate(promo);
                break;
              case PostgresChangeEvent.delete:
                final id = payload.oldRecord['id'] as String?;
                if (id != null) {
                  promotionDatabase.deletePromotion(id);
                  onDelete(id);
                }
                break;
              default:
                break;
            }
            PromotionService.clearCache();
          },
        )
        .subscribe();
  }

  static void disposeRealtimeSync() {
    _channel?.unsubscribe();
    _channel = null;
  }
}

class SyncResult {
  final int uploaded;
  final int downloaded;
  final int failed;

  SyncResult({
    required this.uploaded,
    required this.downloaded,
    required this.failed,
  });

  @override
  String toString() =>
      'Synced: ↑$uploaded ↓$downloaded${failed > 0 ? ' ⚠️$failed failed' : ''}';
}
