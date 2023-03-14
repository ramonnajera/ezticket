use anchor_lang::prelude::*;
use anchor_lang::solana_program::entrypoint::ProgramResult;

declare_id!("H83vdbL8UYq4dGzikGe7pKYSsWwVBkq5EfJUBuS8DrhT");

#[program]
pub mod eztiket {
    use super::*;

    pub fn create(ctx: Context<Create>,img: String, name: String, description: String, price:u64) -> ProgramResult {
        let ticket = &mut ctx.accounts.ticket;
        ticket.img = img;
        ticket.name = name;
        ticket.description = description;
        ticket.price = price;
        ticket.amount_d = 0;
        ticket.admin = *ctx.accounts.user.key;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Whithdraw>, amount: u64) -> ProgramResult{
        let ticket = &mut ctx.accounts.ticket;
        let user = &mut ctx.accounts.user;

        if ticket.admin != *user.key {
            return Err(ProgramError::IncorrectProgramId);
        }
        
        let rent_balance = Rent::get()?.minimum_balance(ticket.to_account_info().data_len());
        
        if **ticket.to_account_info().lamports.borrow()- rent_balance < amount {
            return Err(ProgramError::InsufficientFunds);
        }

        **ticket.to_account_info().try_borrow_mut_lamports()? -= amount;
        **user.to_account_info().try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    pub fn buy(ctx: Context<Buy>, amount: u64) -> ProgramResult {
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.ticket.key(),
            amount
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.ticket.to_account_info()
            ]
        );

        (&mut ctx.accounts.ticket).amount_d += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Create<'info> {
    #[account(init, payer=user, space=9000, seeds=[b"TICKET_DEMO".as_ref(), user.key().as_ref()],bump)]
    pub ticket: Account<'info, Ticket>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[derive(Accounts)]
pub struct Whithdraw<'info>{
    #[account(mut)]
    pub ticket: Account<'info, Ticket>,
    #[account(mut)]
    pub user: Signer<'info>
}

#[derive(Accounts)]
pub struct Buy<'info>{
    #[account(mut)]
    pub ticket: Account<'info, Ticket>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>
}

#[account]
pub struct Ticket {
    pub admin: Pubkey,
    pub img: String,
    pub name: String,
    pub description: String,
    pub amount_d:u64,
    pub price:u64
}
