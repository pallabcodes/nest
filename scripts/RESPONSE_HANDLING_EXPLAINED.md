# How Response Handling Works

Got asked about how the mappers work without `@Res()` and whether we're using `class-transformer`. Writing this down so I remember what I said.

## class-transformer usage

We do use it, but barely. Just in two spots:

1. In validation pipes - `plainToInstance()` converts plain objects to class instances so `class-validator` can do its thing.
2. In DTOs - The `@Type()` decorator transforms query params. Like when you have `?price=123` as a string and need it as a number.

We're not using it for responses though. Mappers just return plain JavaScript objects and NestJS handles the rest.

Here's what I mean - in `CreateProductDto`:
```typescript
@Type(() => Number)  // Turns "123" from query string into actual number
price: number;
```

That's it. No fancy decorators on response objects.

## How mappers work without @Res()

This confused me at first too. Turns out NestJS just automatically serializes whatever you return from a controller method to JSON. That's literally it.

When you return an object, NestJS:
- Takes that object
- Calls `JSON.stringify()` on it
- Sets the `Content-Type: application/json` header
- Sends it

So when we do:
```typescript
async create(@Body() createDto: CreateProductDto) {
  const result = await this.productService.create(createDto);
  return this.responseMapper.toCreateResponse(result);
}
```

The mapper returns something like:
```typescript
{
  success: true,
  message: 'Product created successfully',
  data: { id: 1, name: 'Laptop', ... }
}
```

And NestJS just turns that into JSON and sends it. No `@Res()` needed, no manual serialization, nothing.

## Are mappers just objects?

Yep. They're injectable services that return plain JavaScript objects. No magic happening here.

```typescript
@Injectable()
export class ProductResponseMapper extends BaseResponseMapper<any, any> {
  toResponse(domain: any): any {
    return {
      success: true,
      data: domain,  // Just a regular object
    };
  }
}
```

Why this works: JavaScript objects are JSON-serializable by default. NestJS handles the serialization automatically. We don't need `class-transformer` decorators cluttering up our response objects.

## Is this actually production-ready?

Yeah, it is. This is actually the recommended NestJS pattern.

Why it's good:
- It's the standard way NestJS expects you to do things
- Faster than `class-transformer` since it's native JSON serialization
- Simpler - no decorators everywhere
- Interceptors work properly (they don't if you use `@Res()`)
- Easy to test

When you actually need `@Res()`:
Only when you need streaming, custom headers per response, or manual response control. For normal JSON REST APIs, skip it.

Like if you're streaming a file:
```typescript
@Get('download')
async download(@Res() res: Response) {
  const file = createReadStream('file.pdf');
  res.setHeader('Content-Type', 'application/pdf');
  file.pipe(res);  // This actually needs @Res()
}
```

But for normal responses, don't use it:
```typescript
// Don't do this
@Get(':id')
async findOne(@Param('id') id: string, @Res() res: Response) {
  const product = await this.service.findOne(id);
  return res.json({ success: true, data: product });
  // Problem: Interceptors won't run!
}

// Do this instead
@Get(':id')
async findOne(@Param('id') id: string) {
  const product = await this.service.findOne(id);
  return this.mapper.toResponse(product);  // NestJS handles it
  // Interceptors work fine
}
```

## TransformInterceptor

We have a `TransformInterceptor` that wraps responses if they don't already have a `success` property:

```typescript
export class TransformInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If it already has 'success', leave it alone
        if (data && typeof data === 'object' && 'success' in data) {
          return data as SuccessResponse<T>;
        }
        // Otherwise wrap it
        return new SuccessResponse(data);
      }),
    );
  }
}
```

So if a controller returns `{ success: true, data: product }`, the interceptor sees it already has `success` and passes it through unchanged. If someone forgets and returns just `product`, it wraps it in `{ success: true, data: product }`.

Then NestJS serializes whatever comes out to JSON automatically.

## Other approaches

**Our way (plain objects):**
Simple, fast, interceptors work, standard NestJS pattern, easy to test. The only downside is you have to manually exclude fields in mappers (like passwords), but honestly that's fine - it's explicit and you can see exactly what's happening.

**Using class-transformer for responses:**
You could do this:
```typescript
class ProductResponseDto {
  @Exclude()
  password: string;
  
  @Transform(({ value }) => value.toUpperCase())
  name: string;
}

return plainToInstance(ProductResponseDto, product);
```

But it's overkill for most cases. More complex, slower, requires class definitions for every response type. Not worth it unless you really need automatic field exclusion everywhere.

**Using @Res() for everything:**
Just don't. It breaks interceptors and makes everything more verbose. Only use it when you actually need streaming or manual control.

## Production stuff

What we're doing is fine for production. The only thing I'd improve is replacing `any` types with proper TypeScript interfaces, but that's a gradual improvement, not a blocker.

The mappers already handle field exclusion correctly (like excluding passwords from user responses). Response formats are consistent. Error handling is in place. We're good.
