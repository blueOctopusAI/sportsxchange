import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sports Data API Client
 * Initially uses mock data, ready for SportsDataIO integration
 */
export class SportsDataAPI {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.SPORTS_DATA_API_KEY;
    this.sport = config.sport || 'NFL';
    this.season = config.season || '2024';
    this.useMockData = config.useMockData !== false; // Default to mock for testing
  }

  /**
   * Get upcoming games for a specific week
   */
  async getUpcomingGames(week = null) {
    if (this.useMockData) {
      return this.getMockGames(week);
    }
    
    // TODO: Implement real SportsDataIO API call
    // const url = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/${this.season}/${week}`;
    // const response = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': this.apiKey } });
    // return await response.json();
    
    return this.getMockGames(week);
  }

  /**
   * Get game result
   */
  async getGameResult(gameId) {
    if (this.useMockData) {
      return this.getMockGameResult(gameId);
    }
    
    // TODO: Implement real API call
    return this.getMockGameResult(gameId);
  }

  /**
   * Get team statistics
   */
  async getTeamStats(teamId) {
    return {
      teamId,
      wins: Math.floor(Math.random() * 10),
      losses: Math.floor(Math.random() * 7),
      pointsPerGame: 20 + Math.random() * 15,
      pointsAllowedPerGame: 18 + Math.random() * 12,
      homeRecord: { wins: Math.floor(Math.random() * 5), losses: Math.floor(Math.random() * 3) },
      awayRecord: { wins: Math.floor(Math.random() * 5), losses: Math.floor(Math.random() * 4) },
    };
  }

  /**
   * Get betting odds (for fair value calculation)
   */
  async getBettingOdds(gameId) {
    // Mock betting odds
    const favoriteOdds = -110 - Math.floor(Math.random() * 200); // -110 to -310
    const underdogOdds = 100 + Math.floor(Math.random() * 200); // +100 to +300
    
    return {
      gameId,
      favorite: {
        team: Math.random() > 0.5 ? 'teamA' : 'teamB',
        moneyline: favoriteOdds,
        impliedProbability: this.moneylineToProb(favoriteOdds)
      },
      underdog: {
        team: Math.random() > 0.5 ? 'teamB' : 'teamA',
        moneyline: underdogOdds,
        impliedProbability: this.moneylineToProb(underdogOdds)
      },
      overUnder: 40 + Math.random() * 20,
      spread: 3 + Math.random() * 10
    };
  }

  /**
   * Convert moneyline odds to probability
   */
  moneylineToProb(moneyline) {
    if (moneyline < 0) {
      return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
    } else {
      return 100 / (moneyline + 100);
    }
  }

  /**
   * Get mock games data
   */
  getMockGames(week) {
    const games = [
      {
        gameId: 'NFL_2024_W' + (week || '10') + '_KC_BUF',
        week: week || 10,
        dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        homeTeam: { id: 'BUF', name: 'Buffalo Bills', abbreviation: 'BUF' },
        awayTeam: { id: 'KC', name: 'Kansas City Chiefs', abbreviation: 'KC' },
        stadium: 'Highmark Stadium',
        weather: { temp: 45, condition: 'Clear', wind: 8 },
        status: 'Scheduled'
      },
      {
        gameId: 'NFL_2024_W' + (week || '10') + '_SF_DAL',
        week: week || 10,
        dateTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        homeTeam: { id: 'DAL', name: 'Dallas Cowboys', abbreviation: 'DAL' },
        awayTeam: { id: 'SF', name: 'San Francisco 49ers', abbreviation: 'SF' },
        stadium: 'AT&T Stadium',
        weather: { temp: 72, condition: 'Dome', wind: 0 },
        status: 'Scheduled'
      },
      {
        gameId: 'NFL_2024_W' + (week || '10') + '_GB_CHI',
        week: week || 10,
        dateTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        homeTeam: { id: 'CHI', name: 'Chicago Bears', abbreviation: 'CHI' },
        awayTeam: { id: 'GB', name: 'Green Bay Packers', abbreviation: 'GB' },
        stadium: 'Soldier Field',
        weather: { temp: 38, condition: 'Snow', wind: 15 },
        status: 'Scheduled'
      },
      {
        gameId: 'NFL_2024_W' + (week || '10') + '_DET_HOU',
        week: week || 10,
        dateTime: new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString(),
        homeTeam: { id: 'HOU', name: 'Houston Texans', abbreviation: 'HOU' },
        awayTeam: { id: 'DET', name: 'Detroit Lions', abbreviation: 'DET' },
        stadium: 'NRG Stadium',
        weather: { temp: 72, condition: 'Dome', wind: 0 },
        status: 'Scheduled'
      }
    ];

    return games;
  }

  /**
   * Get mock game result
   */
  getMockGameResult(gameId) {
    // Simulate random game result
    const homeScore = Math.floor(Math.random() * 35) + 10;
    const awayScore = Math.floor(Math.random() * 35) + 10;
    
    return {
      gameId,
      status: 'Final',
      homeScore,
      awayScore,
      winner: homeScore > awayScore ? 'home' : 'away',
      overtime: Math.random() < 0.1,
      quarters: [
        { home: Math.floor(homeScore * 0.3), away: Math.floor(awayScore * 0.25) },
        { home: Math.floor(homeScore * 0.25), away: Math.floor(awayScore * 0.3) },
        { home: Math.floor(homeScore * 0.25), away: Math.floor(awayScore * 0.25) },
        { home: Math.floor(homeScore * 0.2), away: Math.floor(awayScore * 0.2) }
      ],
      stats: {
        homeTeam: {
          totalYards: 300 + Math.floor(Math.random() * 200),
          passingYards: 200 + Math.floor(Math.random() * 150),
          rushingYards: 80 + Math.floor(Math.random() * 100),
          turnovers: Math.floor(Math.random() * 3)
        },
        awayTeam: {
          totalYards: 300 + Math.floor(Math.random() * 200),
          passingYards: 200 + Math.floor(Math.random() * 150),
          rushingYards: 80 + Math.floor(Math.random() * 100),
          turnovers: Math.floor(Math.random() * 3)
        }
      }
    };
  }

  /**
   * Calculate fair market probability based on multiple factors
   */
  async calculateFairProbability(gameId) {
    const odds = await this.getBettingOdds(gameId);
    const games = await this.getUpcomingGames();
    const game = games.find(g => g.gameId === gameId);
    
    if (!game) return { teamA: 0.5, teamB: 0.5 };
    
    const homeStats = await this.getTeamStats(game.homeTeam.id);
    const awayStats = await this.getTeamStats(game.awayTeam.id);
    
    // Simple model combining betting odds and team performance
    const homePowerRating = homeStats.wins / (homeStats.wins + homeStats.losses);
    const awayPowerRating = awayStats.wins / (awayStats.wins + awayStats.losses);
    
    // Home field advantage (typically 3 points = ~0.54 probability)
    const homeAdvantage = 0.54;
    
    // Combine factors
    let homeProb = (homePowerRating * 0.3) + // Team strength
                    (odds.favorite.team === 'home' ? odds.favorite.impliedProbability * 0.5 : odds.underdog.impliedProbability * 0.5) + // Betting market
                    (homeAdvantage * 0.2); // Home advantage
    
    // Normalize to ensure probabilities sum to 1
    const awayProb = 1 - homeProb;
    
    return {
      home: homeProb,
      away: awayProb,
      confidence: 0.7 + Math.random() * 0.3 // 70-100% confidence
    };
  }

  /**
   * Stream live game updates (simulated)
   */
  async* streamGameUpdates(gameId, intervalMs = 5000) {
    let quarter = 1;
    let timeRemaining = 900; // 15 minutes in seconds
    let homeScore = 0;
    let awayScore = 0;
    
    while (quarter <= 4) {
      // Simulate score changes
      if (Math.random() < 0.1) { // 10% chance of score
        if (Math.random() < 0.5) {
          homeScore += Math.random() < 0.7 ? 3 : 7; // FG or TD
        } else {
          awayScore += Math.random() < 0.7 ? 3 : 7;
        }
      }
      
      yield {
        gameId,
        quarter,
        timeRemaining: `${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`,
        homeScore,
        awayScore,
        possession: Math.random() < 0.5 ? 'home' : 'away',
        fieldPosition: Math.floor(Math.random() * 100),
        lastPlay: this.generateRandomPlay()
      };
      
      timeRemaining -= 30; // 30 seconds per update
      
      if (timeRemaining <= 0) {
        quarter++;
        timeRemaining = 900;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    // Game finished
    yield {
      gameId,
      status: 'Final',
      homeScore,
      awayScore,
      winner: homeScore > awayScore ? 'home' : 'away'
    };
  }

  generateRandomPlay() {
    const plays = [
      'Pass complete for 12 yards',
      'Rush for 5 yards',
      'Pass incomplete',
      'Sack for -7 yards',
      'Pass complete for 25 yards',
      'Rush for no gain',
      'Pass intercepted',
      'Fumble recovered by defense',
      'Field goal attempt',
      'Touchdown!',
      'Punt',
      'Penalty: Holding, 10 yards'
    ];
    
    return plays[Math.floor(Math.random() * plays.length)];
  }
}

// Export singleton instance
export const sportsAPI = new SportsDataAPI({ useMockData: true });
