import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { User } from './entities/user.entity.js';
import { UserPage } from './entities/user-page.entity.js';
import { Role } from './entities/role.entity.js';
import { CreateUserInput } from './dto/create-user.input.js';
import { UpdateUserInput } from './dto/update-user.input.js';
import { UserFilterArgs } from './dto/user-filter.args.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';

/**
 * Puerta GraphQL del módulo (spec 004). Toda la administración de cuentas
 * es exclusiva de ADMINISTRADOR, a diferencia de vehículos/unidades: no hay
 * vista de "solo consulta" para el resto de los roles (RF-14). `RolesGuard`
 * lee los metadatos de `context.getHandler()` (el método), no de la clase,
 * así que `@Roles` se repite en cada query/mutation en vez de una sola vez
 * en el resolver.
 */
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Query(() => UserPage, { name: 'users' })
  findAll(@Args() filters: UserFilterArgs) {
    return this.usersService.findAll(filters);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Query(() => User, { name: 'user' })
  findOne(@Args('id') id: string) {
    return this.usersService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Query(() => [Role], { name: 'roles' })
  listRoles() {
    return this.usersService.listRoles();
  }

  @ResolveField(() => Role)
  role(@Parent() user: User) {
    return this.usersService.getRole(user.roleId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Mutation(() => User)
  createUser(@Args('input') input: CreateUserInput) {
    return this.usersService.create(input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Mutation(() => User)
  updateUser(@Args('id') id: string, @Args('input') input: UpdateUserInput) {
    return this.usersService.update(id, input);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Mutation(() => User)
  deactivateUser(@Args('id') id: string) {
    return this.usersService.deactivate(id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMINISTRADOR')
  @Mutation(() => User)
  reactivateUser(@Args('id') id: string) {
    return this.usersService.reactivate(id);
  }
}
