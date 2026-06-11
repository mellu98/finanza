import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/AppShell";
import { CoachContextProvider } from "@/features/coach/CoachContext";
import { CoachSettingsProvider } from "@/features/coach/CoachSettingsContext";
import { CoachPage } from "@/features/coach/CoachPage";
import { DailyBudgetPage } from "@/features/daily-coach/DailyBudgetPage";
import { DailyCoachDashboard } from "@/features/dashboard/DailyCoachDashboard";
import { DebtsPage } from "@/features/debts/DebtsPage";
import { DebtsProvider } from "@/features/debts/DebtsContext";
import { SavingsGoalsPage } from "@/features/goals/SavingsGoalsPage";
import { SavingsGoalsProvider } from "@/features/goals/SavingsGoalsContext";
import { MonthlyPlanPage } from "@/features/monthly-plan/MonthlyPlanPage";
import { MonthlyPlanProvider } from "@/features/monthly-plan/MonthlyPlanContext";
import { OfflinePage } from "@/features/offline/OfflinePage";
import { AffordabilitySimulator } from "@/features/simulator/AffordabilitySimulator";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import { TransactionsProvider } from "@/features/transactions/TransactionsContext";
import { ThemeProvider } from "next-themes";
import { Redirect, Route, Router, Switch } from "wouter";

import "@/styles/globals.css";

/**
 * Daily Financial Coach — Warm theme (Dime / Monarch inspired).
 *
 * Provider order (outermost → innermost):
 *   1. ThemeProvider
 *   2. Toaster
 *   3. CoachSettingsProvider
 *   4. MonthlyPlanProvider
 *   5. TransactionsProvider
 *   6. SavingsGoalsProvider
 *   7. DebtsProvider
 *   8. CoachContextProvider
 *
 * Routing (wouter <Switch> is first-match):
 *   /              → /dashboard (redirect)
 *   /dashboard     → DailyCoachDashboard
 *   /plan          → MonthlyPlanPage
 *   /budget        → DailyBudgetPage
 *   /goals         → SavingsGoalsPage
 *   /debts         → DebtsPage
 *   /transactions  → TransactionsPage
 *   /coach         → CoachPage
 *   /simulator     → AffordabilitySimulator
 *   /offline       → OfflinePage (also rendered when SW serves the fallback)
 */
export function App() {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme="light"
			enableSystem
			disableTransitionOnChange
		>
			<CoachSettingsProvider>
				<MonthlyPlanProvider>
					<TransactionsProvider>
						<SavingsGoalsProvider>
							<DebtsProvider>
								<CoachContextProvider>
									<Router>
										<Switch>
											<Route path="/offline" component={OfflinePage} />
											<Route>
												<AppShell>
													<Switch>
														<Route path="/" component={HomeRedirect} />
														<Route
															path="/dashboard"
															component={DailyCoachDashboard}
														/>
														<Route
															path="/plan"
															component={MonthlyPlanPage}
														/>
														<Route
															path="/budget"
															component={DailyBudgetPage}
														/>
														<Route
															path="/goals"
															component={SavingsGoalsPage}
														/>
														<Route path="/debts" component={DebtsPage} />
														<Route
															path="/transactions"
															component={TransactionsPage}
														/>
														<Route path="/coach" component={CoachPage} />
														<Route
															path="/simulator"
															component={AffordabilitySimulator}
														/>
														<Route>
															<Redirect to="/dashboard" />
														</Route>
													</Switch>
												</AppShell>
											</Route>
										</Switch>
									</Router>
									<Toaster richColors position="top-center" />
								</CoachContextProvider>
							</DebtsProvider>
						</SavingsGoalsProvider>
					</TransactionsProvider>
				</MonthlyPlanProvider>
			</CoachSettingsProvider>
		</ThemeProvider>
	);
}

function HomeRedirect() {
	return <Redirect to="/dashboard" />;
}
