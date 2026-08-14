import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(id: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Profile with ID ${id} not found`);
    }

    return data;
  }

  async updateProfile(id: string, updates: any) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    return data;
  }

  async toggleFollow(followerId: string, followingId: string) {
    const supabase = this.supabaseService.getClient();

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (existingFollow) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (error) throw new InternalServerErrorException(error.message);

      // Decrement counts
      await this.updateFollowCounts(followerId, followingId, -1);
      
      return { following: false };
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId });

      if (error) throw new InternalServerErrorException(error.message);

      // Increment counts
      await this.updateFollowCounts(followerId, followingId, 1);

      return { following: true };
    }
  }

  private async updateFollowCounts(followerId: string, followingId: string, increment: number) {
    const supabase = this.supabaseService.getClient();
    
    // In a real production app with Supabase, this is better handled by a Postgres trigger
    // or an RPC call to avoid race conditions. For now, we do it via RPC if we assume one exists,
    // otherwise we fetch and update (which has race conditions). 
    // We'll use the fetch-and-update approach for simplicity as per the plan.

    const { data: follower } = await supabase.from('profiles').select('following_count').eq('id', followerId).single();
    if (follower) {
      await supabase.from('profiles').update({ following_count: (follower.following_count || 0) + increment }).eq('id', followerId);
    }

    const { data: following } = await supabase.from('profiles').select('followers_count').eq('id', followingId).single();
    if (following) {
      await supabase.from('profiles').update({ followers_count: (following.followers_count || 0) + increment }).eq('id', followingId);
    }
  }
}
