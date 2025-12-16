<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { auth } from '$lib/stores/auth';
	import { loadAndSetProfiles } from '$lib/auth';
	import {
		acceptInvitation,
		// getCompanyByCode,
		requestJoin,
		searchCompanies,
		type CompanySearchResult
	} from '$lib/api/onboarding';
	import { Carousel, CarouselContent, CarouselItem } from '$lib/components/ui/carousel';
	import OnboardingSteps from '$lib/components/OnboardingSteps.svelte';
	import type { CarouselAPI } from '$lib/components/ui/carousel/context';
	import ProfileCard from './ProfileCard.svelte';
	import OptionsCard from './OptionsCard.svelte';
	import CreateCompanyCard from './CreateCompanyCard.svelte';
	import JoinCompanyCard from './JoinCompanyCard.svelte';

	const steps = [{ label: 'Tu perfil' }, { label: 'Elige una opción' }, { label: 'Completa' }];

	let selectedPath = $state<'create' | 'join' | ''>('');
	let pendingInvitations = $state<typeof $auth.pendingInvitations>([]);
	let isAcceptingInvitation = $state(false);
	let acceptingInvitationId = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);
	let userName = $state($page.url.searchParams.get('userName') ?? '');
	let showOtherOptions = $state(false);
	let userToggledOptions = $state(false);
	let stage = $state(0);
	let carouselApi = $state<CarouselAPI | undefined>(undefined);

	let searchQuery = $state('');
	let searchResults = $state<CompanySearchResult[]>([]);
	let isSearching = $state(false);
	let searchError = $state<string | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	// let inviteCode = $state('');
	// let codeCompany = $state<CompanySearchResult | null>(null);
	// let isCheckingCode = $state(false);
	// let codeError = $state<string | null>(null);

	let selectedCompany = $state<CompanySearchResult | null>(null);
	let joinError = $state<string | null>(null);
	let isSubmittingJoin = $state(false);

	$effect(() => {
		const unsub = auth.subscribe((state) => {
			pendingInvitations = state.pendingInvitations;
			if (!userName.trim() && state.user?.name) {
				userName = state.user.name;
			}
			if (!userToggledOptions) {
				showOtherOptions = state.pendingInvitations.length === 0;
			}
		});
		return unsub;
	});

	const handleSearchInput = (value: string) => {
		searchQuery = value;
		searchError = null;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (value.trim().length < 2) {
			searchResults = [];
			return;
		}

		searchTimeout = setTimeout(async () => {
			isSearching = true;
			try {
				searchResults = await searchCompanies(value.trim());
			} catch (error) {
				searchError = error instanceof Error ? error.message : 'Error al buscar empresas';
				searchResults = [];
			} finally {
				isSearching = false;
			}
		}, 300);
	};

	// const handleCheckCode = async () => {
	// 	if (!inviteCode.trim()) return;

	// 	isCheckingCode = true;
	// 	codeError = null;
	// 	codeCompany = null;

	// 	try {
	// 		codeCompany = await getCompanyByCode(inviteCode.trim());
	// 		if (codeCompany) {
	// 			selectedCompany = codeCompany;
	// 			joinError = null;
	// 		}
	// 	} catch (error) {
	// 		codeError = error instanceof Error ? error.message : 'Código no válido';
	// 	} finally {
	// 		isCheckingCode = false;
	// 	}
	// };

	const handleSelectCompany = (company: CompanySearchResult) => {
		selectedCompany = company;
		joinError = null;
	};

	const handleJoinSubmit = async () => {
		if (!selectedCompany || isSubmittingJoin) return;

		const trimmedName = userName.trim();
		if (!trimmedName) {
			joinError = 'Tu nombre es obligatorio';
			stage = 0;
			carouselApi?.scrollTo(0);
			return;
		}

		isSubmittingJoin = true;
		joinError = null;

		try {
			await requestJoin({
				companyId: selectedCompany.id,
				name: trimmedName
			});
			await goto(resolve('/onboarding/status'));
		} catch (error) {
			joinError = error instanceof Error ? error.message : 'Error al enviar la solicitud';
		} finally {
			isSubmittingJoin = false;
		}
	};

	$effect(() => {
		if (!carouselApi) return;

		const syncStage = () => {
			stage = carouselApi?.selectedScrollSnap() ?? 0;
		};

		carouselApi.on('select', syncStage);
		syncStage();

		return () => {
			carouselApi?.off('select', syncStage);
		};
	});

	const handleAcceptInvitation = async (token: string, invitationId: string) => {
		if (isAcceptingInvitation) return;

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio para aceptar la invitación';
			return;
		}

		isAcceptingInvitation = true;
		acceptingInvitationId = invitationId;
		errorMessage = null;

		try {
			const result = await acceptInvitation(token, userName.trim());

			if (result.status === 'ACTIVE' && result.user) {
				// Critical: update auth store before navigating, otherwise the layout guard
				// will still think onboarding is required and bounce back to /onboarding.
				auth.setUser(result.user);
				try {
					await loadAndSetProfiles();
				} catch {
					// ignore profile loading issues; user can still proceed with default context
				}
				await goto(resolve('/'));
				return;
			}

			// If backend says we still need onboarding / approval, sync store and route accordingly.
			if (result.status === 'PENDING_APPROVAL') {
				auth.setOnboardingStatus('PENDING_APPROVAL', [], result.requests ?? []);
				await goto(resolve('/onboarding/status'));
				return;
			}

			auth.setOnboardingStatus('ONBOARDING_REQUIRED', result.pendingInvitations ?? [], []);
			await goto(resolve('/onboarding'));
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'Error al aceptar la invitación';
		} finally {
			isAcceptingInvitation = false;
			acceptingInvitationId = null;
		}
	};

	const handleContinue = () => {
		if (stage === 0) {
			if (!userName.trim()) {
				errorMessage = 'Tu nombre es obligatorio para continuar';
				return;
			}
			errorMessage = null;
			stage = 1;
			carouselApi?.scrollTo(1);
			return;
		}

		if (stage === 1) {
			if (!selectedPath) {
				errorMessage = 'Selecciona una opción para continuar';
				return;
			}
			errorMessage = null;
			stage = 2;
			carouselApi?.scrollTo(2);
			return;
		}

		if (!userName.trim()) {
			errorMessage = 'Tu nombre es obligatorio para continuar';
			stage = 0;
			carouselApi?.scrollTo(0);
			return;
		}

		errorMessage = null;
	};
</script>

<div class="grow flex items-center justify-center bg-background px-4 py-8">
	<div class="w-full max-w-2xl space-y-6">
		<OnboardingSteps {steps} currentStep={stage} />

		<Carousel
			class="w-full"
			opts={{ align: 'start', duration: 20 }}
			setApi={(api) => {
				carouselApi = api;
			}}
		>
			<CarouselContent class="w-full items-start">
				<CarouselItem class="flex justify-center">
					<ProfileCard bind:userName {errorMessage} onContinue={handleContinue} />
				</CarouselItem>

				<CarouselItem class="flex justify-center">
					<OptionsCard
						{pendingInvitations}
						bind:showOtherOptions
						bind:userToggledOptions
						bind:selectedPath
						{errorMessage}
						{isAcceptingInvitation}
						{acceptingInvitationId}
						onAcceptInvitation={handleAcceptInvitation}
						onBack={() => {
							stage = 0;
							carouselApi?.scrollTo(0);
						}}
						onContinue={handleContinue}
					/>
				</CarouselItem>

				<CarouselItem class="flex justify-center">
					<div class="relative w-full max-w-xl">
						<CreateCompanyCard
							userName={userName.trim()}
							isActive={selectedPath === 'create' && stage === 2}
							onBack={() => {
								stage = 1;
								carouselApi?.scrollTo(1);
							}}
							onSuccess={() => goto(resolve('/'))}
						/>

						<JoinCompanyCard
							isActive={selectedPath === 'join' && stage === 2}
							{searchQuery}
							{searchResults}
							{isSearching}
							{searchError}
							{joinError}
							{selectedCompany}
							{isSubmittingJoin}
							onBack={() => {
								stage = 1;
								carouselApi?.scrollTo(1);
							}}
							onSearchInput={handleSearchInput}
							onSelectCompany={handleSelectCompany}
							onSubmitJoin={handleJoinSubmit}
						/>
					</div>
				</CarouselItem>
			</CarouselContent>
		</Carousel>
	</div>
</div>
