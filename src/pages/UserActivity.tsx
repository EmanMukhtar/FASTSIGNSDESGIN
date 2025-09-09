import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Activity, Clock, FileText, TrendingUp, Calendar, Target } from 'lucide-react';

interface ActivityData {
  date: string;
  logins: number;
  filesUploaded: number;
  jobsCreated: number;
  totalTime: number;
}

const UserActivity = () => {
  const { user } = useAuth();
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalLogins: 0,
    totalFiles: 0,
    totalJobs: 0,
    avgDailyTime: 0,
    streakDays: 0
  });

  useEffect(() => {
    if (user) {
      fetchActivityData();
    }
  }, [user]);

  const fetchActivityData = async () => {
    try {
      // Generate mock activity data - in real app, this would come from analytics
      const mockData: ActivityData[] = [];
      const today = new Date();
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        mockData.push({
          date: date.toISOString().split('T')[0],
          logins: Math.floor(Math.random() * 5) + 1,
          filesUploaded: Math.floor(Math.random() * 10),
          jobsCreated: Math.floor(Math.random() * 3),
          totalTime: Math.floor(Math.random() * 180) + 30 // minutes
        });
      }
      
      setActivityData(mockData);
      
      // Calculate total stats
      const totals = mockData.reduce((acc, day) => ({
        totalLogins: acc.totalLogins + day.logins,
        totalFiles: acc.totalFiles + day.filesUploaded,
        totalJobs: acc.totalJobs + day.jobsCreated,
        avgDailyTime: acc.avgDailyTime + day.totalTime
      }), { totalLogins: 0, totalFiles: 0, totalJobs: 0, avgDailyTime: 0 });
      
      setTotalStats({
        ...totals,
        avgDailyTime: Math.floor(totals.avgDailyTime / mockData.length),
        streakDays: 12 // Mock streak
      });
      
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const ActivityChart = ({ data }: { data: ActivityData[] }) => {
    const maxValue = Math.max(...data.map(d => d.logins + d.filesUploaded + d.jobsCreated));
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {data.slice(-28).map((day, index) => {
            const intensity = (day.logins + day.filesUploaded + day.jobsCreated) / maxValue;
            const opacity = Math.max(0.1, intensity);
            
            return (
              <div
                key={index}
                className="w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110"
                style={{
                  backgroundColor: `hsl(var(--fast-blue))`,
                  opacity: opacity
                }}
                title={`${day.date}: ${day.logins + day.filesUploaded + day.jobsCreated} activities`}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Activity className="h-6 w-6 text-fast-blue" />
        <h1 className="text-3xl font-bold text-foreground">Activity Dashboard</h1>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="border-l-4 border-l-fast-blue">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Total Logins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fast-blue">{totalStats.totalLogins}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-fast-red">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <FileText className="h-4 w-4 mr-1" />
              Files Uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fast-red">{totalStats.totalFiles}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-fast-blue">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Target className="h-4 w-4 mr-1" />
              Jobs Created
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fast-blue">{totalStats.totalJobs}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-fast-red">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Avg Daily Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fast-red">{totalStats.avgDailyTime}m</div>
            <p className="text-xs text-muted-foreground">Per day</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-fast-blue">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Current Streak
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-fast-blue">{totalStats.streakDays}</div>
            <p className="text-xs text-muted-foreground">Days active</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Activity Visualization */}
      <Tabs defaultValue="heatmap" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="heatmap">Activity Heatmap</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="heatmap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Heatmap</CardTitle>
              <CardDescription>Your activity pattern over the last 28 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityChart data={activityData} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Files Uploaded</span>
                    <span>85%</span>
                  </div>
                  <Progress value={85} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Jobs Created</span>
                    <span>62%</span>
                  </div>
                  <Progress value={62} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Time Spent</span>
                    <span>78%</span>
                  </div>
                  <Progress value={78} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Achievements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">🔥 Streak Master</Badge>
                  <span className="text-sm text-muted-foreground">10+ day streak</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">📁 File Handler</Badge>
                  <span className="text-sm text-muted-foreground">50+ files uploaded</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary">⚡ Speed Runner</Badge>
                  <span className="text-sm text-muted-foreground">Quick job creation</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Goals</CardTitle>
              <CardDescription>Track your progress towards monthly targets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Upload 100 files</span>
                  <span className="text-sm text-muted-foreground">{totalStats.totalFiles}/100</span>
                </div>
                <Progress value={(totalStats.totalFiles / 100) * 100} className="h-3" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Create 20 jobs</span>
                  <span className="text-sm text-muted-foreground">{totalStats.totalJobs}/20</span>
                </div>
                <Progress value={(totalStats.totalJobs / 20) * 100} className="h-3" />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Maintain 25-day streak</span>
                  <span className="text-sm text-muted-foreground">{totalStats.streakDays}/25</span>
                </div>
                <Progress value={(totalStats.streakDays / 25) * 100} className="h-3" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserActivity;